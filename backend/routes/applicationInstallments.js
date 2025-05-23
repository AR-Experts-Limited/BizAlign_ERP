// routes/installments.js
const express = require('express');
const router = express.Router();
const multer = require('multer'); // To handle file uploads
const axios = require('axios');
const { PDFDocument, rgb } = require('pdf-lib');// Ensure the path is correct
const { sendToClients } = require('../utils/sseService');
const { uploadPdfToS3 } = require('../utils/applications3Helper');



const { Expo } = require('expo-server-sdk');



const storage = multer.memoryStorage();
const upload = multer({ storage });

// GET all installments for a specific user
router.get('/', async (req, res) => {
    const Installment = req.db.model('Installment', require('../models/installments').schema);
    const { user_ID } = req.query; // Filter by user_ID
    try {
        if (!user_ID) {
            return res.status(400).json({ message: 'user_ID is required.' });
        }
        const installments = await Installment.find({ user_ID });
        res.json(installments);
    } catch (error) {
        console.error('Error fetching installments:', error);
        res.status(500).json({ message: 'Error fetching deductions' });
    }
});

router.patch('/:id/signed', async (req, res) => {
    const Installment = req.db.model('Installment', require('../models/installments').schema);
    try {
        const { signed, typedName, signature } = req.body;

        // Validate input
        if (signed === undefined || !typedName || !signature) {
            return res.status(400).json({ message: 'Missing required fields: signed, typedName, and signature.' });
        }

        // Fetch the existing installment record
        const existingInstallment = await Installment.findById(req.params.id);
        if (!existingInstallment) {
            return res.status(404).json({ message: 'Installment not found.' });
        }

        // 1. Load the template PDF from S3 as Page 1
        const templateUrl = 'https://rainacrm.s3.us-east-1.amazonaws.com/templates/template_installments.pdf'; // Replace with the actual S3 URL
        const templateResponse = await axios.get(templateUrl, { responseType: 'arraybuffer' });
        const templateBytes = Buffer.from(templateResponse.data, 'binary');
        const pdfDoc = await PDFDocument.load(templateBytes);

        const form = pdfDoc.getForm();
        const page1 = pdfDoc.getPages()[0];

        // Fill form fields
        form.getTextField('driverName').setText(existingInstallment.driverName);
        form.getTextField('installmentType').setText(existingInstallment.installmentType);
        form.getTextField('installmentRate').setText(`£${existingInstallment.installmentRate}`);
        form.getTextField('tenure').setText(`${existingInstallment.tenure} Weeks`);
        //form.getTextField('installmentPending').setText(`£${existingInstallment.installmentPending}`);
        form.getTextField('spreadRate').setText(`£${existingInstallment.spreadRate}`);
        form.getTextField('site').setText(existingInstallment.site);
        form.getTextField('addedOn').setText(new Date(existingInstallment.addedBy.addedOn).toLocaleDateString());
        form.getTextField('signature').setText(typedName);

        // Embed and draw the signature image
        const signatureResponse = await axios.get(signature, { responseType: 'arraybuffer' });
        const signaturePng = await pdfDoc.embedPng(signatureResponse.data);
        page1.drawImage(signaturePng, {
            x: 350,
            y: 290,
            width: 60,
            height: 60,
        });

        // Flatten the form to make it non-editable
        form.flatten();


        // 2. Conditionally handle second page
        if (existingInstallment.installmentDocument) {
            try {
                const rawUrl = existingInstallment.installmentDocument;
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
                console.warn('Error handling installmentDocument:', imageError.message);
            }
        }

        // 3. Save the merged PDF and upload to S3
        const finalPdfBytes = await pdfDoc.save();
        const fileName = `${existingInstallment.user_ID}_${Date.now()}_final_installment`;
        const s3Result = await uploadPdfToS3(req.db.db.databaseName, Buffer.from(finalPdfBytes), existingInstallment.user_ID, 'installment-forms', fileName);

        // 4. Update the installmentDocument URL in the database
        existingInstallment.signed = signed; // Use boolean for signed
        existingInstallment.signature = typedName;
        existingInstallment.installmentDocument = s3Result.url;
        const updatedInstallment = await existingInstallment.save();
        sendToClients(
            req.db, {
            type: 'installmentUpdated', // Custom event to signal data update
        });

        res.json({
            message: 'Installment signed and final PDF generated successfully.',
            installment: updatedInstallment,
        });
    } catch (error) {
        console.error('Error generating signed PDF with bill image:', error);
        res.status(500).json({ message: 'Error generating final installment PDF.', error });
    }
});

// GET count of unsigned installments for a specific user - For App
router.get('/unsigned/:user_ID', async (req, res) => {
    const Installment = req.db.model('Installment', require('../models/installments').schema);
    try {
        const { user_ID } = req.params;

        if (!user_ID) {
            return res.status(400).json({ message: 'user_ID is required.' });
        }

        const unsignedInstallments = await Installment.find({ user_ID, signed: false }).countDocuments();

        res.status(200).json({
            unsignedInstallments,
        });
    } catch (error) {
        console.error('Error fetching unsigned installments:', error);
        res.status(500).json({ message: 'Error fetching unsigned installments', error });
    }
});


// GET all installments (with optional filtering by site)
router.get('/', async (req, res) => {
    const Installment = req.db.model('Installment', require('../models/installments').schema);
    const { site } = req.query
    try {
        const query = site ? { site } : {}
        const installments = await Installment.find(query);
        res.json(installments);
    } catch (error) {
        console.error('Error fetching installments:', error);
        res.status(500).json({ message: 'Error fetching installments' });
    }
});

router.get('/:driverId', async (req, res) => {
    const Installment = req.db.model('Installment', require('../models/installments').schema);
    try {
        const installments = await Installment.find(req.params);
        res.json(installments);
    } catch (error) {
        console.error('Error fetching installments:', error);
        res.status(500).json({ message: 'Error fetching installments' });
    }
});

router.put('/', async (req, res) => {
    const Installment = req.db.model('Installment', require('../models/installments').schema);
    const { _id, driverId, installmentType, tenure, installmentPending } = req.body
    try {
        const installments = await Installment.updateOne(
            { driverId: driverId, _id },
            {
                $set: {
                    tenure: tenure,
                    installmentPending: installmentPending,
                }
            }
        )
        sendToClients(
            req.db, {
            type: 'installmentUpdated', // Custom event to signal data update
        });
        res.status(200).json(installments)
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating installments' });
    }
}
)

// POST a new Installment
router.post('/', upload.any(), async (req, res) => {
    const Installment = req.db.model('Installment', require('../models/installments').schema);
    const Notification = req.db.model('Notification', require('../models/notifications').schema);

    const { TestUser } = req.db.model('User', require('../models/User').schema);

    const { driverId, driverName, installmentRate, tenure, site, installmentType, installmentPending, spreadRate, signed } = req.body;
    var { addedBy } = req.body;
    addedBy = JSON.parse(addedBy)
    try {
        const doc = req.files[0]?.location || ''
        const newInstallment = new Installment({ driverId, driverName, installmentRate, tenure, site, installmentType, installmentPending, spreadRate, addedBy, signed, installmentDocument: doc });
        await newInstallment.save();

        // Fetch the user
        const user = await TestUser.findOne({ user_ID: addedBy.user_ID });
        if (!user || !user.expoPushToken) {
            console.error('User not found or push token is missing.');
        } else {
            // Send push notification
            const expo = new Expo();
            const message = {
                to: user.expoPushToken,
                sound: 'default',
                title: 'New Installment Added',
                body: `A new installment has been added for ${driverName} at ${site}.`,
                data: { installmentId: newInstallment._id },
            };

            try {
                await expo.sendPushNotificationsAsync([message]);
            } catch (notificationError) {
                console.error('Error sending push notification:', notificationError.message);
            }

            // Save notification in the database
            const newNotification = new Notification({
                user_ID: addedBy.user_ID,
                title: 'New Installment Added',
                body: `A new installment has been added for ${driverName} at ${site}.`,
                data: { installmentId: newInstallment._id },
            });
            await newNotification.save();
        }


        res.status(201).json(newInstallment);
    } catch (error) {
        console.error('Error adding Installment:', error);
        res.status(500).json({ message: 'Error adding Installment', error });
    }
});

//POST bill 
router.post('/docupload', upload.any(), async (req, res) => {
    const Installment = req.db.model('Installment', require('../models/installments').schema);
    const { _id } = req.body;
    const objectId = new mongoose.Types.ObjectId(_id);
    try {
        const doc = req.files[0].location || ''
        const updatedInstallment = await Installment.findByIdAndUpdate(objectId, {
            $set: { installmentDocument: doc }
        })
        sendToClients(
            req.db, {
            type: 'installmentUpdated', // Custom event to signal data update
        });
        res.status(200).json(updatedInstallment)
    }
    catch (error) {
        res.status(500).json({ message: error })
    }

})

// delete bill
router.post('/deleteupload', async (req, res) => {
    const Installment = req.db.model('Installment', require('../models/installments').schema);
    const { id } = req.body;
    const objectId = new mongoose.Types.ObjectId(id);
    try {
        const updatedInstallment = await Installment.findByIdAndUpdate(objectId, {
            $unset: { installmentDocument: "" },
        })
        sendToClients(
            req.db, {
            type: 'installmentUpdated', // Custom event to signal data update
        });
        res.status(200).json(updatedInstallment)
    }
    catch (error) {
        res.status(500).json({ message: error })
    }
})

// DELETE a Installment by ID
router.delete('/:id', async (req, res) => {
    const Installment = req.db.model('Installment', require('../models/installments').schema);
    const DayInvoice = req.db.model('DayInvoice', require('../models/DayInvoice').schema);
    try {
        const installment = await Installment.findById(req.params.id)
        const dayInvoices = await DayInvoice.find({ driverId: installment.driverId, 'installmentDetail._id': req.params.id })
        const updateDayInvoices = async () => {
            await Promise.all(
                dayInvoices.map(async (dayInvoice) => {

                    const installment = dayInvoice.installmentDetail.find(
                        (detail) => detail._id == req.params.id
                    );

                    await DayInvoice.updateOne(
                        { _id: dayInvoice._id },
                        {
                            $set: {
                                total: dayInvoice.total + parseFloat(installment.perDayInstallmentRate),
                            },
                            $pull: {
                                installmentDetail: { _id: req.params.id }
                            }
                        }
                    );
                })
            );
        };
        updateDayInvoices()

        await Installment.findByIdAndDelete(req.params.id);
        sendToClients(
            req.db, {
            type: 'installmentUpdated', // Custom event to signal data update
        });
        res.json({ message: 'Installment deleted successfully' });
    } catch (error) {
        console.error('Error deleting Installment:', error);
        res.status(500).json({ message: 'Error deleting Installment', error });
    }
});

module.exports = router;