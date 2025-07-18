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


router.patch('/:id/signed', upload.none(), async (req, res) => {
    const Installment = req.db.model('Installment', require('../models/installments').schema);
    try {
        const { signed, typedName, signature } = req.body;

        // Validate required inputs
        if (signed === undefined || !typedName || !signature) {
            return res.status(400).json({ message: 'Missing required fields: signed, typedName, and signature.' });
        }

        // Fetch existing installment
        const existing = await Installment.findById(req.params.id);
        if (!existing) return res.status(404).json({ message: 'Installment not found.' });

        // Load and parse the PDF template from S3
        const templateUrl = 'https://rainacrm.s3.us-east-1.amazonaws.com/templates/template_installments.pdf';
        const templateRes = await axios.get(templateUrl, { responseType: 'arraybuffer' });
        const pdfDoc = await PDFDocument.load(templateRes.data);
        const form = pdfDoc.getForm();
        const page1 = pdfDoc.getPages()[0];

        // Populate form fields
        form.getTextField('driverName').setText(existing.driverName);
        form.getTextField('installmentType').setText(existing.installmentType);
        form.getTextField('installmentRate').setText(`£${existing.installmentRate}`);
        form.getTextField('tenure').setText(`${existing.tenure} Weeks`);
        form.getTextField('spreadRate').setText(`£${existing.spreadRate}`);
        form.getTextField('site').setText(existing.site);
        form.getTextField('addedOn').setText(new Date(existing.addedBy.addedOn).toLocaleDateString());
        form.getTextField('signature').setText(typedName);

        // Embed signer signature image
        const sigRes = await axios.get(signature, { responseType: 'arraybuffer' });
        const sigImage = await pdfDoc.embedPng(sigRes.data);
        page1.drawImage(sigImage, { x: 350, y: 290, width: 60, height: 60 });

        // Make the filled form non-editable
        form.flatten();

        // --- Handle second page attachments (image or PDF) ---
        if (existing.installmentDocument) {
            try {
                let url = existing.installmentDocument;
                if (!url.startsWith('http')) {
                    url = `https://rainacrm.s3.us-east-1.amazonaws.com/${url}`;
                }
                const ext = url.split('.').pop().toLowerCase();
                const pageWidth = 595.28, pageHeight = 841.89;

                if (['jpg', 'jpeg', 'png'].includes(ext)) {
                    // Embed image as a new page
                    const imgRes = await axios.get(url, { responseType: 'arraybuffer' });
                    const imgBuf = imgRes.data;
                    const img = ext === 'png'
                        ? await pdfDoc.embedPng(imgBuf)
                        : await pdfDoc.embedJpg(imgBuf);

                    const { width: iw, height: ih } = img.scale(1);
                    const scale = Math.min(pageWidth / iw, pageHeight / ih, 1);
                    const w = iw * scale, h = ih * scale;
                    const x = (pageWidth - w) / 2, y = (pageHeight - h) / 2;

                    const page2 = pdfDoc.addPage([pageWidth, pageHeight]);
                    page2.drawImage(img, { x, y, width: w, height: h });
                } else if (ext === 'pdf') {
                    // Copy pages from the attached PDF
                    const attachRes = await axios.get(url, { responseType: 'arraybuffer' });
                    const attachDoc = await PDFDocument.load(attachRes.data);
                    const pages = await pdfDoc.copyPages(attachDoc, attachDoc.getPageIndices());
                    pages.forEach(p => pdfDoc.addPage(p));
                } else {
                    // Fallback: render a clickable link
                    const page2 = pdfDoc.addPage([pageWidth, pageHeight]);
                    page2.drawText('Link to attached document:', { x: 50, y: pageHeight - 100, size: 16 });
                    const lines = url.match(/.{1,90}/g) || [url];
                    lines.forEach((ln, i) => {
                        page2.drawText(ln, { x: 50, y: pageHeight - 130 - i * 18, size: 12, color: rgb(0, 0, 1) });
                    });
                }
            } catch (attachErr) {
                console.warn('Attachment merge failed:', attachErr.message);
            }
        }

        // Save merged PDF and upload to S3
        const outputBytes = await pdfDoc.save();
        const fileKey = `${existing.user_ID}_${Date.now()}_final_installment`;
        const s3 = await uploadPdfToS3(
            req.db.db.databaseName,
            Buffer.from(outputBytes),
            existing.user_ID,
            'installment-forms',
            fileKey
        );

        // Persist new URL and signed flag
        existing.signed = signed;
        existing.installmentDocument = s3.url;
        const saved = await existing.save();

        // Notify clients via SSE
        sendToClients(req.db, { type: 'installmentUpdated' });

        res.json({ message: 'Installment signed and PDF generated.', installment: saved });
    } catch (err) {
        console.error('Signing install error:', err);
        res.status(500).json({ message: 'Failed to generate final installment PDF.', error: err.message });
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