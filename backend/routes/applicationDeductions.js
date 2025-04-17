const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const { PDFDocument } = require('pdf-lib');
const { sendToClients } = require('../utils/sseService');
const { uploadPdfToS3 } = require('../utils/applications3Helper');
const moment = require('moment-timezone');
const { listObjectsFromS3 } = require('../utils/applications3Helper');


const { Expo } = require('expo-server-sdk');



// Multer configuration for in-memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// GET all deductions for a specific user
router.get('/', async (req, res) => {
  const Deduction = req.db.model('Deductions', require('../models/deductions').schema);
  const { user_ID } = req.query; // Filter by user_ID
  try {
    if (!user_ID) {
      return res.status(400).json({ message: 'user_ID is required.' });
    }
    const deductions = await Deduction.find({ user_ID });
    res.json(deductions);
  } catch (error) {
    console.error('Error fetching deductions:', error);
    res.status(500).json({ message: 'Error fetching deductions' });
  }
});


// GET count of unsigned deductions for a specific user - For App
router.get('/unsigned/:user_ID', async (req, res) => {
  const Deduction = req.db.model('Deductions', require('../models/deductions').schema);
  try {
    const { user_ID } = req.params;

    if (!user_ID) {
      return res.status(400).json({ message: 'user_ID is required.' });
    }

    const unsignedDeductions = await Deduction.find({ user_ID, signed: false }).countDocuments();

    res.status(200).json({
      unsignedDeductions,
    });
  } catch (error) {
    console.error('Error fetching unsigned deductions:', error);
    res.status(500).json({ message: 'Error fetching unsigned deductions', error });
  }
});


// GET filtered deductions for a user
router.get('/filter', async (req, res) => {
  const Deduction = req.db.model('Deductions', require('../models/deductions').schema);
  const { user_ID, date } = req.query;
  try {
    if (!user_ID) {
      return res.status(400).json({ message: 'user_ID is required.' });
    }
    const query = { user_ID };
    if (date) query.date = date;

    const deductions = await Deduction.find(query);
    res.json(deductions);
  } catch (error) {
    console.error('Error fetching deductions:', error);
    res.status(500).json({ message: 'Error fetching deductions' });
  }
});

// POST a new deduction and send a notification
router.post('/', async (req, res) => {
  const Deduction = req.db.model('Deductions', require('../models/deductions').schema);
  const Notification = req.db.model('Notification', require('../models/notifications').schema);
  const { TestUser } = req.db.model('User', require('../models/User').schema);

  const { site, user_ID, driverId, driverName, serviceType, rate, date } = req.body;

  try {
    if (!user_ID) {
      return res.status(400).json({ message: 'user_ID is required.' });
    }

    // Create the new deduction
    const newDeduction = new Deduction({
      site,
      user_ID,
      driverId,
      driverName,
      serviceType,
      rate,
      date,
    });
    await newDeduction.save();

    // Find the user to get the push token
    const user = await TestUser.findOne({ user_ID });
    if (!user || !user.expoPushToken) {
      console.error('User not found or push token is missing.');
    } else {
      // Send push notification
      const expo = new Expo();
      const message = {
        to: user.expoPushToken,
        sound: 'default',
        title: 'New Deduction Added',
        body: `A new deduction has been added for ${driverName} at ${site}.`,
        data: { deductionId: newDeduction._id },
      };

      try {
        await expo.sendPushNotificationsAsync([message]);
      } catch (notificationError) {
        console.error('Error sending push notification:', notificationError.message);
      }

      // Save notification in the database

      const newNotification = new Notification({
        user_ID: user_ID,
        title: 'New Deduction Added',
        body: `A new deduction has been added for ${driverName} at ${site}.`,
        data: { deductionId: newDeduction._id },
      });
      await newNotification.save();
    }
    sendToClients(
      req.db, {
      type: 'deductionUpdated', // Custom event to signal data update
    });
    // Return success response
    res.status(201).json({ message: 'Deduction added and notification sent.', deduction: newDeduction });
  } catch (error) {
    console.error('Error adding deduction:', error);
    res.status(500).json({ message: 'Error adding deduction', error });
  }
});

// PATCH - Sign and generate final PDF with bill image
router.patch('/:id/signed', async (req, res) => {
  const Deduction = req.db.model('Deductions', require('../models/deductions').schema);
  try {
    const { signed, typedName, signature } = req.body;

    // Input validation
    if (signed === undefined || !typedName || !signature) {
      return res.status(400).json({ message: 'Missing required fields: signed, typedName, and signature.' });
    }

    // Fetch the existing deduction record
    const existingDeduction = await Deduction.findById(req.params.id);
    if (!existingDeduction) {
      return res.status(404).json({ message: 'Deduction not found.' });
    }

    // 1. Load the template PDF from S3 as Page 1
    const templateUrl = 'https://rainacrm.s3.us-east-1.amazonaws.com/templates/template_deduction.pdf';
    const templateResponse = await axios.get(templateUrl, { responseType: 'arraybuffer' });
    const templateBytes = Buffer.from(templateResponse.data, 'binary');
    const pdfDoc = await PDFDocument.load(templateBytes);

    const form = pdfDoc.getForm();
    const page1 = pdfDoc.getPages()[0];

    const londonDate = moment(existingDeduction.date)
      .tz('Europe/London')
      .format('DD/MM/YYYY');

    // Fill form fields
    form.getTextField('driverName').setText(existingDeduction.driverName);
    form.getTextField('serviceType').setText(existingDeduction.serviceType);
    form.getTextField('rate').setText(`£${existingDeduction.rate}`);
    form.getTextField('date').setText(londonDate);
    form.getTextField('signature').setText(typedName);

    console.log('TimeFromServer:')
    console.log(new Date(existingDeduction.date).toLocaleDateString('en-GB', {
      timeZone: 'Europe/London',
    }))

    // Embed and draw the signature image
    const signatureResponse = await axios.get(signature, { responseType: 'arraybuffer' });
    const signaturePng = await pdfDoc.embedPng(signatureResponse.data);
    page1.drawImage(signaturePng, {
      x: 350,
      y: 290,
      width: 60,
      height: 25,
    });

    // Flatten the form to make it non-editable
    form.flatten();

    // 2. Add the bill image as Page 2
    const billImageResponse = await axios.get(existingDeduction.deductionDocument, { responseType: 'arraybuffer' });
    const billImageBuffer = Buffer.from(billImageResponse.data, 'binary');

    // Determine the file extension (Supports jpg, jpeg, png)
    const imageUrl = existingDeduction.deductionDocument;
    const fileExtension = imageUrl.split('.').pop().toLowerCase(); // Get file extension

    let billImage;
    if (fileExtension === 'png') {
      billImage = await pdfDoc.embedPng(billImageBuffer);
    } else if (fileExtension === 'jpg' || fileExtension === 'jpeg') {
      billImage = await pdfDoc.embedJpg(billImageBuffer);
    } else {
      return res.status(400).json({ message: 'Unsupported image format. Only PNG, JPG, and JPEG are allowed.' });
    }

    // Get original image dimensions
    const { width: imgWidth, height: imgHeight } = billImage.scale(1);

    // Define A4 page size
    const pageWidth = 595.28; // A4 width in points
    const pageHeight = 841.89; // A4 height in points

    // Calculate scaling factor to fit the image inside A4 while maintaining aspect ratio
    const scaleFactor = Math.min(pageWidth / imgWidth, pageHeight / imgHeight, 1);

    // Scale the image
    const finalWidth = imgWidth * scaleFactor;
    const finalHeight = imgHeight * scaleFactor;

    // Calculate position to center the image
    const xPosition = (pageWidth - finalWidth) / 2;
    const yPosition = (pageHeight - finalHeight) / 2;

    const page2 = pdfDoc.addPage([pageWidth, pageHeight]); // A4 page

    // Draw the image in its original aspect ratio
    page2.drawImage(billImage, {
      x: xPosition,
      y: yPosition,
      width: finalWidth,
      height: finalHeight,
    });

    // 3. Save the merged PDF and upload to S3
    const finalPdfBytes = await pdfDoc.save();
    const fileName = `${existingDeduction.user_ID}_${Date.now()}_final_deduction`;
    const s3Result = await uploadPdfToS3(req.db.db.databaseName, Buffer.from(finalPdfBytes), existingDeduction.user_ID, 'deduction-forms', fileName);

    // 4. Update the deductionDocument URL in the database
    existingDeduction.signed = signed; // Use boolean for signed
    existingDeduction.deductionDocument = s3Result.url;
    const updatedDeduction = await existingDeduction.save();

    sendToClients(
      req.db, {
      type: 'deductionUpdated', // Custom event to signal data update
    });

    res.json({
      message: 'Deduction signed and final PDF generated successfully.',
      deduction: updatedDeduction,
    });
  } catch (error) {
    console.error('Error generating signed PDF with bill image:', error);
    res.status(500).json({ message: 'Error generating final deduction PDF.', error });
  }
});


// Endpoint to list invoices from S3
router.get('/invoices', async (req, res) => {
  const DayInvoice = req.db.model('DayInvoice', require('../models/DayInvoice').schema);
  const { user_ID } = req.query;

  try {
    if (!user_ID) {
      return res.status(400).json({ message: 'user_ID is required.' });
    }

    const invoices = await DayInvoice.find({ user_ID });

    if (!invoices || invoices.length === 0) {
      return res.status(404).json({
        message: 'No invoices found.'
      });
    }

    // valid invoices only 
    const validInvoices = invoices.filter(invoice => invoice.invoicedoc);

    if (validInvoices.length === 0) {
      return res.status(404).json({ message: 'No valid invoices found.' });
    }

    // Convert invoices into an array of objects containing key and url to be fetched in app
    const invoiceList = validInvoices.map(invoice => ({
      key: invoice.invoicedoc.split('/').pop(),
      url: invoice.invoicedoc
    }));

    return res.status(200).json({
      invoices: invoiceList,
      message: 'Successfully retrieved invoices.'
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ message: 'Error fetching invoices.', error: error.message });
  }
});

module.exports = router;
