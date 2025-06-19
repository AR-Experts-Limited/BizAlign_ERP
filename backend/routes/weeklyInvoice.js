const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const multerS3 = require('multer-s3');
const s3 = require('./aws'); // Ensure this is configured
const { Expo } = require('expo-server-sdk');
const nodemailer = require('nodemailer');

const uploadDoc = multer({
    storage: multerS3({
        s3,
        bucket: process.env.AWS_S3_BUCKET_NAME,
        key: (req, file, cb) => {
            const { driverId, actionType } = req.body;
            const tenant = req.db.dbName;
            const folder = actionType === 'sentInvoice' ? 'sent' : 'download';
            const filename = `${Date.now()}-${file.originalname}`;
            const key = `${tenant}/${driverId}/${folder}/${filename}`;
            cb(null, key);
        },
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: (req, file, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
    }),
});


const getModels = (req) => ({
    WeeklyInvoice: req.db.model('WeeklyInvoice', require('../models/weeklyInvoice').schema),
    Installment: req.db.model('Installment', require('../models/installments').schema),
});

// GET route to retrieve weekly invoices
router.get('/', async (req, res) => {
    try {
        const { WeeklyInvoice } = getModels(req)
        const { driverIds, serviceWeeks, site } = req.query;

        // Build query object
        const query = {};
        if (driverIds && driverIds.length > 0) {
            query.driverId = { $in: driverIds.map(id => new mongoose.Types.ObjectId(id)) };
        }
        if (serviceWeeks) query.serviceWeek = { $in: serviceWeeks };
        if (site) query.site = site;

        // Fetch weekly invoices and populate the invoices field
        const weeklyInvoices = await WeeklyInvoice.find(query).populate('invoices').populate('installments').populate({ path: 'driverId' });


        res.status(200).json({ message: 'Weekly invoices retrieved successfully', data: weeklyInvoices });
    } catch (error) {
        console.error('Error retrieving weekly invoices:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT route to update weekly invoice and associated installments
router.put('/update', async (req, res) => {
    try {
        const { WeeklyInvoice, Installment } = getModels(req);
        const { weeklyInvoiceId, installmentDetail, weeklyTotal, instalments } = req.body;

        // if (!weeklyInvoiceId || !installmentDetail || !weeklyTotal || !instalments) {
        //     return res.status(400).json({ message: 'Missing required fields in request body' });
        // }

        // Validate ObjectId format
        if (!mongoose.Types.ObjectId.isValid(weeklyInvoiceId)) {
            return res.status(400).json({ message: 'Invalid weeklyInvoiceId format' });
        }

        // Update the WeeklyInvoice document
        await WeeklyInvoice.findByIdAndUpdate(
            weeklyInvoiceId,
            {
                installmentDetail,
                total: weeklyTotal,
                installments: installmentDetail.map((d) => d._id), // just the IDs
            },
            { new: true }
        );


        const updatedWeeklyInvoice = await WeeklyInvoice.findById(weeklyInvoiceId).populate('invoices').populate('installments').populate({ path: 'driverId' });

        if (!updatedWeeklyInvoice) {
            return res.status(404).json({ message: 'Weekly invoice not found' });
        }

        // Update each corresponding Installment document
        const installmentUpdatePromises = instalments.map((insta) => {
            if (!mongoose.Types.ObjectId.isValid(insta._id)) return null;
            return Installment.findByIdAndUpdate(insta._id, insta, { new: true });
        });

        const updatedInstallments = await Promise.all(installmentUpdatePromises);

        res.status(200).json({
            message: 'Weekly invoice and installments updated successfully',
            weeklyInvoice: updatedWeeklyInvoice,
            updatedInstallments,
        });
    } catch (error) {
        console.error('Error updating weekly invoice:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


router.put('/document', uploadDoc.single('document'), async (req, res) => {
    try {
        const { WeeklyInvoice, User, Notification } = getModels(req);
        const { weeklyInvoiceId, driverId, driverEmail, driverName, actionType } = req.body;

        if (!['sentInvoice', 'downloadInvoice'].includes(actionType)) {
            return res.status(400).json({ message: 'Invalid actionType' });
        }

        if (!mongoose.Types.ObjectId.isValid(weeklyInvoiceId)) {
            return res.status(400).json({ message: 'Invalid weeklyInvoiceId' });
        }

        const fileUrl = req.file?.location;
        if (!fileUrl) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const update = {
            $push: {
                [actionType]: {
                    date: new Date(),
                    document: fileUrl,
                },
            },
        };

        await WeeklyInvoice.findByIdAndUpdate(weeklyInvoiceId, update, { new: true });

        const updated = await WeeklyInvoice.findById(weeklyInvoiceId).populate('invoices').populate('installments').populate({ path: 'driverId' });

        if (!updated) {
            return res.status(404).json({ message: 'Weekly invoice not found' });
        }

        console.log('driverEmail:', driverEmail)
        // --- Send email if sentInvoice ---
        if (actionType === 'sentInvoice') {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.MAILER_EMAIL,
                    pass: process.env.MAILER_APP_PASSWORD,
                },
            });

            const mailOptions = {
                from: process.env.MAILER_EMAIL,
                to: 'ramachandransanjaykumar@gmail.com',
                subject: 'Your Payslip is Ready',
                html: `
          <div style="font-family: Arial, sans-serif; background-color: #f4f8ff; padding: 20px; border-radius: 10px; text-align: center;">
            <h2 style="color: #2a73cc;">Your PaySlip is Ready, ${driverName} </h2>
            <p style="font-size: 16px; color: #333;">Please check your earnings for the week below:</p>
            <div style="margin: 20px 0;">
              <a href="${fileUrl}" target="_blank" rel="noopener" 
                style="background-color: #ff9900; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">
                📄 Download Invoice
              </a>
            </div>
            <p style="color: #555;">Thank you for your hard work!</p>
            <p style="font-weight: bold; color: #2a73cc;">Best wishes,<br>Raina Ltd.</p>
          </div>
        `,
            };

            await transporter.sendMail(mailOptions);

            //     // Optional: Send push notification if user has Expo token
            //     const user = await User.findById(driverId);
            //     if (user?.expoPushTokens?.length) {
            //         const expo = new Expo();
            //         const message = {
            //             to: user.expoPushTokens,
            //             title: 'New Invoice Available',
            //             body: 'Your new payslip has been sent.',
            //             isRead: false,
            //         };

            //         try {
            //             await expo.sendPushNotificationsAsync([message]);
            //         } catch (err) {
            //             console.error('Expo notification error:', err.message);
            //         }
            //     }

            //     // Save notification in DB
            //     await new Notification({
            //         title: 'Invoice Sent',
            //         user_ID: user?.user_ID,
            //         body: 'A new payslip has been emailed to you.',
            //         isRead: false,
            //         targetDevice: 'app',
            //     }).save();
            // 
        }

        res.status(200).json({
            message: `${actionType === 'sentInvoice' ? 'Invoice sent and saved' : 'Invoice downloaded and saved'}`,
            url: fileUrl,
            updatedWeeklyInvoice: updated,
        });
    } catch (error) {
        console.error('Error uploading document:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});



module.exports = router;