const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const mongoose = require('mongoose');

const { PDFDocument, rgb } = require('pdf-lib');
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


router.patch('/:id/signed', async (req, res) => {
  const Deduction = req.db.model('Deductions', require('../models/deductions').schema);
  try {
    const { signed, typedName, signature } = req.body;

    if (signed === undefined || !typedName || !signature) {
      return res.status(400).json({ message: 'Missing required fields: signed, typedName, and signature.' });
    }

    const existingDeduction = await Deduction.findById(req.params.id);
    if (!existingDeduction) {
      return res.status(404).json({ message: 'Deduction not found.' });
    }

    // NEW: addedBy.addedOn
    const addedOnLondonDate = moment(existingDeduction.addedBy?.addedOn)
      .tz('Europe/London')
      .format('DD/MM/YYYY');

    const londonDate = moment(existingDeduction.date).tz('Europe/London').format('DD/MM/YYYY');

    // Load template
    const templateUrl = 'https://rainacrm.s3.us-east-1.amazonaws.com/templates/deduction_new_template.pdf';
    const templateResponse = await axios.get(templateUrl, { responseType: 'arraybuffer' });
    const templateBytes = Buffer.from(templateResponse.data, 'binary');
    const pdfDoc = await PDFDocument.load(templateBytes);
    const form = pdfDoc.getForm();
    const page1 = pdfDoc.getPages()[0];

    // Fill form
    form.getTextField('driverName').setText(existingDeduction.driverName);
    form.getTextField('serviceType').setText(existingDeduction.serviceType);
    form.getTextField('rate').setText(`£${existingDeduction.rate}`);
    form.getTextField('date').setText(londonDate);
    form.getTextField('week').setText(existingDeduction.week);
    form.getTextField('vehicleRegPlate').setText(existingDeduction.vehicleRegPlate);
    form.getTextField('addedOnDate').setText(addedOnLondonDate);

    const signatureResponse = await axios.get(signature, { responseType: 'arraybuffer' });
    const signaturePng = await pdfDoc.embedPng(signatureResponse.data);
    page1.drawImage(signaturePng, {
      x: 350,
      y: 200,
      width: 60,
      height: 60,
    });

    form.flatten();

    // Add second page (image or link)
    if (existingDeduction.deductionDocument) {
      try {
        const rawUrl = existingDeduction.deductionDocument;
        const fileExtension = rawUrl.split('.').pop().toLowerCase();
        const pageWidth = 595.28;
        const pageHeight = 841.89;

        let documentUrl = rawUrl;
        if (!documentUrl.startsWith('http')) {
          documentUrl = `https://rainacrm.s3.us-east-1.amazonaws.com/${documentUrl}`;
        }

        if (['jpg', 'jpeg', 'png'].includes(fileExtension)) {
          const billImageResponse = await axios.get(documentUrl, { responseType: 'arraybuffer' });
          const billImageBuffer = Buffer.from(billImageResponse.data, 'binary');

          let billImage;
          if (fileExtension === 'png') {
            billImage = await pdfDoc.embedPng(billImageBuffer);
          } else {
            billImage = await pdfDoc.embedJpg(billImageBuffer);
          }

          const { width: imgWidth, height: imgHeight } = billImage.scale(1);
          const scaleFactor = Math.min(pageWidth / imgWidth, pageHeight / imgHeight, 1);
          const finalWidth = imgWidth * scaleFactor;
          const finalHeight = imgHeight * scaleFactor;
          const xPosition = (pageWidth - finalWidth) / 2;
          const yPosition = (pageHeight - finalHeight) / 2;

          const page2 = pdfDoc.addPage([pageWidth, pageHeight]);
          page2.drawImage(billImage, {
            x: xPosition,
            y: yPosition,
            width: finalWidth,
            height: finalHeight,
          });
        } else if (fileExtension === 'pdf') {
          const attachedPdfResponse = await axios.get(documentUrl, { responseType: 'arraybuffer' });
          const attachedPdfDoc = await PDFDocument.load(attachedPdfResponse.data);

          const pages = await pdfDoc.copyPages(attachedPdfDoc, attachedPdfDoc.getPageIndices());
          pages.forEach((page) => {
            pdfDoc.addPage(page);
          });
        } else {
          // fallback: show document link
          const page2 = pdfDoc.addPage([pageWidth, pageHeight]);
          page2.drawText(`Link to attached document:`, {
            x: 50,
            y: pageHeight - 100,
            size: 16,
          });
          const wrappedUrl = documentUrl.match(/.{1,90}/g) || [documentUrl];
          wrappedUrl.forEach((line, idx) => {
            page2.drawText(line, {
              x: 50,
              y: pageHeight - 130 - (idx * 18),
              size: 12,
              color: rgb(0, 0, 1),
            });
          });
        }
      } catch (imageError) {
        console.warn('Error processing deductionDocument:', imageError.message);
      }
    }

    // Save PDF and upload to S3
    const finalPdfBytes = await pdfDoc.save();
    const fileName = `${existingDeduction.user_ID}_${Date.now()}_final_deduction`;
    const s3Result = await uploadPdfToS3(
      req.db.db.databaseName,
      Buffer.from(finalPdfBytes),
      existingDeduction.user_ID,
      'deduction-forms',
      fileName
    );

    // Update DB
    existingDeduction.signed = signed;
    existingDeduction.deductionDocument = s3Result.url;
    const updatedDeduction = await existingDeduction.save();

    sendToClients(req.db, {
      type: 'deductionUpdated',
    });

    res.json({
      message: 'Deduction signed and final PDF generated successfully.',
      deduction: updatedDeduction,
    });
  } catch (error) {
    console.error('Error generating signed PDF:', error);
    res.status(500).json({ message: 'Error generating final deduction PDF.', error });
  }
});


// GET the latest invoice for a given user_ID
router.get('/invoices', async (req, res) => {
  const WeeklyInvoice = req.db.model(
    'WeeklyInvoice',
    require('../models/weeklyInvoice').schema
  );
  const { user_ID } = req.query;

  if (!user_ID) {
    return res.status(400).json({ message: 'user_ID is required.' });
  }



  try {
    const [latest] = await WeeklyInvoice.aggregate([
      { $match: { user_ID } },
      { $unwind: '$sentInvoice' },
      { $sort: { 'sentInvoice.date': -1 } },
      { $limit: 1 },
      {
        $project: {
          _id: 0,
          serviceWeek: 1,
          document: '$sentInvoice.document'
        }
      }
    ]);


    if (!latest) {
      return res.status(200).json({
        invoices: [],
        message: 'No invoices found.'
      });
    }


    const invoices = [
      {
        key: `${latest.serviceWeek}-Invoice`,
        url: latest.document
      }
    ];

    // Send it back
    return res.status(200).json({ invoices });
  } catch (error) {
    console.error('Error fetching latest invoice:', error);
    return res.status(500).json({
      message: 'Error fetching invoices.',
      error: error.message
    });
  }
});

module.exports = router;