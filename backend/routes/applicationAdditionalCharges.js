/* routes/applicationAdditionalCharges.js */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const { PDFDocument, rgb } = require('pdf-lib');
const { sendToClients } = require('../utils/sseService');
const { uploadPdfToS3 } = require('../utils/applications3Helper');
const moment = require('moment-timezone');
const { listObjectsFromS3 } = require('../utils/applications3Helper');


const { Expo } = require('expo-server-sdk');



// Multer configuration for in-memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// GET all additional charges for a specific user
router.get('/', async (req, res) => {
    const AdditionalCharges = req.db.model('AdditionalCharges', require('../models/additionalCharges').schema);
    const { user_ID } = req.query; // Filter by user_ID
    try {
        if (!user_ID) {
            return res.status(400).json({ message: 'user_ID is required.' });
        }
        const additionalCharges = await AdditionalCharges.find({ user_ID });
        res.json(additionalCharges);
    } catch (error) {
        console.error('Error fetching additional charges:', error);
        res.status(500).json({ message: 'Error fetching additional charges' });
    }
});


// GET count of unsigned additional charges for a specific user - For App
router.get('/unsigned/:user_ID', async (req, res) => {
    const AdditionalCharges = req.db.model('AdditionalCharges', require('../models/additionalCharges').schema);
    try {
        const { user_ID } = req.params;

        if (!user_ID) {
            return res.status(400).json({ message: 'user_ID is required.' });
        }

        const unsignedAdditionalCharges = await AdditionalCharges.find({ user_ID, signed: false }).countDocuments();

        res.status(200).json({
            unsignedAdditionalCharges,
        });
    } catch (error) {
        console.error('Error fetching unsigned additional charges:', error);
        res.status(500).json({ message: 'Error fetching unsigned additional charges', error });
    }
});


// GET filtered additional charges for a user
router.get('/filter', async (req, res) => {
    const AdditionalCharges = req.db.model('AdditionalCharges', require('../models/additionalCharges').schema);
    const { user_ID, date } = req.query;
    try {
        if (!user_ID) {
            return res.status(400).json({ message: 'user_ID is required.' });
        }
        const query = { user_ID };
        if (date) query.date = date;

        const additionalCharges = await AdditionalCharges.find(query);
        res.json(additionalCharges);
    } catch (error) {
        console.error('Error fetching additional charges:', error);
        res.status(500).json({ message: 'Error fetching additional charges' });
    }
});


router.patch('/:id/signed', async (req, res) => {
    const AdditionalCharges = req.db.model('AdditionalCharges', require('../models/additionalCharges').schema);
    try {
        const { signed, typedName, signature } = req.body;

        if (signed === undefined || !typedName || !signature) {
            return res.status(400).json({ message: 'Missing required fields: signed, typedName, and signature.' });
        }

        const existingAdditionalCharge = await AdditionalCharges.findById(req.params.id);
        if (!existingAdditionalCharge) {
            return res.status(404).json({ message: 'Additional Charge not found.' });
        }

        const londonDate = moment(existingAdditionalCharge.date).tz('Europe/London').format('DD/MM/YYYY');

        // Load template
        const templateUrl = 'https://rainacrm.s3.us-east-1.amazonaws.com/templates/additionalcharges_template.pdf';
        const templateResponse = await axios.get(templateUrl, { responseType: 'arraybuffer' });
        const templateBytes = Buffer.from(templateResponse.data, 'binary');
        const pdfDoc = await PDFDocument.load(templateBytes);
        const form = pdfDoc.getForm();
        const page1 = pdfDoc.getPages()[0];

        // Fill form with only the specified fields
        form.getTextField('driverName').setText(existingAdditionalCharge.driverName || '');
        form.getTextField('site').setText(existingAdditionalCharge.site || ''); // Assuming template has a 'site' field
        form.getTextField('week').setText(existingAdditionalCharge.week || '');
        form.getTextField('title').setText(existingAdditionalCharge.title || ''); // Mapping 'title' to the 'serviceType' field in the PDF
        form.getTextField('type').setText(existingAdditionalCharge.type || ''); // Assuming template has a 'type' field
        form.getTextField('rate').setText(`£${existingAdditionalCharge.rate || 0}`);
        //form.getTextField('date').setText(londonDate); // Keeping date as it's essential for signed documents

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
        if (existingAdditionalCharge.additionalChargeDocument) {
            try {
                const rawUrl = existingAdditionalCharge.additionalChargeDocument;
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
                } else {
                    // Add a link instead of image
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
                console.warn('Error processing additionalChargeDocument:', imageError.message);
            }
        }

        // Save PDF and upload to S3
        const finalPdfBytes = await pdfDoc.save();
        const fileName = `${existingAdditionalCharge.user_ID}_${Date.now()}_final_additional_charge`;
        const s3Result = await uploadPdfToS3(
            req.db.db.databaseName,
            Buffer.from(finalPdfBytes),
            existingAdditionalCharge.user_ID,
            'additional-charge-forms',
            fileName
        );

        // Update DB
        existingAdditionalCharge.signed = signed;
        existingAdditionalCharge.additionalChargeDocument = s3Result.url;
        const updatedAdditionalCharge = await existingAdditionalCharge.save();

        sendToClients(req.db, {
            type: 'additionalChargeUpdated',
        });

        res.json({
            message: 'Additional Charge signed and final PDF generated successfully.',
            additionalCharge: updatedAdditionalCharge,
        });
    } catch (error) {
        console.error('Error generating signed PDF:', error);
        res.status(500).json({ message: 'Error generating final additional charge PDF.', error });
    }
});


module.exports = router;
