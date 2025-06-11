const express = require('express');
const { Expo } = require('expo-server-sdk');
const router = express.Router();
const multer = require('multer'); // To handle file uploads
const mongoose = require('mongoose');
const multerS3 = require('multer-s3');
const { sendToClients } = require('../utils/sseService');
const s3 = require('./aws'); // Optional: To delete files from file system
const moment = require('moment')

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    contentDisposition: 'inline',
    key: (req, file, cb) => {
      const databaseName = req.db.db.databaseName
      const installmentDriverId = req.body.driverId;
      cb(null, `${databaseName}/Installments/${Date.now()}/${installmentDriverId}/${file.originalname}`);
    },
  }),
});

// Helper function to get models from req.db
const getModels = (req) => ({
  Installment: req.db.model('Installment', require('../models/installments').schema),
  WeeklyInvoice: req.db.model('WeeklyInvoice', require('../models/weeklyInvoice').schema),
  Driver: req.db.model('Driver', require('../models/Driver').schema),
  DayInvoice: req.db.model('DayInvoice', require('../models/DayInvoice').schema),
  User: req.db.model('User', require('../models/User').schema),
  Notification: req.db.model('Notification', require('../models/notifications').schema),
});

// GET all installments (with optional filtering by site)
//router.get('/', async (req, res) => {
//  const { site } = req.query;
//  try {
//    const { Installment } = getModels(req);
//    const query = site ? { site } : {};
//    const installments = await Installment.find(query);
//    res.json(installments);
//  } catch (error) {
//    console.error('Error fetching installments:', error);
//    res.status(500).json({ message: 'Error fetching installments', error: error.message });
//  }
//});

//Fetches Installments (Non-Disabled Drivers only)
router.get('/', async (req, res) => {
  const { site } = req.query;

  try {
    const { Installment, Driver } = getModels(req);

    // Step 1: Get installments (filtered by site if provided)
    const query = site ? { site } : {};
    const installments = await Installment.find(query);

    // Step 2: Extract all driverIds
    const driverIds = installments.map(inst => inst.driverId);

    // Step 3: Find only drivers who are disabled
    const disabledDrivers = await Driver.find({
      _id: { $in: driverIds },
      disabled: true
    });

    const disabledDriverIds = new Set(disabledDrivers.map(d => d._id.toString()));

    // Step 4: Filter out installments where driver is explicitly disabled
    const filteredInstallments = installments.filter(inst =>
      !disabledDriverIds.has(inst.driverId?.toString())
    );

    res.status(200).json(filteredInstallments);
  } catch (error) {
    console.error('Error fetching installments:', error);
    res.status(500).json({ message: 'Error fetching installments', error: error.message });
  }
});

// GET installments by driver ID
router.get('/:driverId', async (req, res) => {
  try {
    const { Installment } = getModels(req);
    const installments = await Installment.find(req.params);
    res.json(installments);
  } catch (error) {
    console.error('Error fetching installments:', error);
    res.status(500).json({ message: 'Error fetching installments', error: error.message });
  }
});

// PUT update installment details
router.put('/', async (req, res) => {
  const { _id, driverId, installmentType, tenure, installmentPending } = req.body;
  try {
    const { Installment } = getModels(req);
    const installments = await Installment.updateOne(
      { driverId, _id },
      {
        $set: {
          tenure,
          installmentPending,
        },
      }
    );
    sendToClients(
      req.db, {
      type: 'installmentUpdated', // Custom event to signal data update
    });
    res.status(200).json(installments);
  } catch (error) {
    res.status(500).json({ message: 'Error updating installments', error: error.message });
  }
});

// POST a new installment
router.post('/', upload.any(), async (req, res) => {
  const { driverId, driverName, user_ID, installmentRate, tenure, site, installmentType, installmentPending, spreadRate, signed } = req.body;
  let { addedBy } = req.body;
  // addedBy = JSON.parse(addedBy);

  try {
    const { Installment, User, Notification, WeeklyInvoice } = getModels(req);
    const doc = req.files[0]?.location || '';

    const newInstallment = new Installment({
      driverId,
      driverName,
      user_ID,
      installmentRate,
      tenure,
      site,
      installmentType,
      installmentPending,
      spreadRate,
      addedBy,
      signed,
      installmentDocument: doc,
    });
    await newInstallment.save();

    // Find the user to get the push token
    const user = await User.findOne({ user_ID });
    if (user?.expoPushTokens) {
      const expo = new Expo();
      const message = {
        to: user.expoPushTokens,
        title: 'New Installment Added',
        body: `A new installment has been added for ${driverName} at ${site}. Make sure to sign the document!`,
        data: { installmentId: newInstallment._id },
        isRead: false,
      };

      try {
        await expo.sendPushNotificationsAsync([message]);
      } catch (notificationError) {
        console.error('Error sending push notification:', notificationError.message);
      }
    }

    const updatedWeeklyInvoice = await WeeklyInvoice.findOneAndUpdate(
      { driverId },
      {
        $addToSet: { installments: newInstallment._id }, // Add Installment _id to installments array
        $set: {
          unsigned: !signed || undefined, // Update unsigned if installment is not signed
        },
      },
      { new: true } // Return updated document
    );

    // Save notification
    const notification = {
      title: 'New Installment Added',
      user_ID,
      body: `A new installment has been added for ${driverName} at ${site}`,
      data: { installmentId: newInstallment._id },
      isRead: false,
    };
    await new Notification({ notification, targetDevice: 'app' }).save();
    sendToClients(
      req.db, {
      type: 'installmentUpdated', // Custom event to signal data update
    });
    res.status(201).json(newInstallment);
  } catch (error) {
    console.error('Error adding installment:', error);
    res.status(500).json({ message: 'Error adding installment', error: error.message });
  }
});

// POST upload installment document
router.post('/docupload', upload.any(), async (req, res) => {
  const { _id } = req.body;
  const objectId = new mongoose.Types.ObjectId(_id);

  try {
    const { Installment } = getModels(req);
    const doc = req.files[0]?.location || '';
    const updatedInstallment = await Installment.findByIdAndUpdate(objectId, {
      $set: { installmentDocument: doc },
    });
    sendToClients(
      req.db, {
      type: 'installmentUpdated', // Custom event to signal data update
    });
    res.status(200).json(updatedInstallment);
  } catch (error) {
    res.status(500).json({ message: 'Error uploading document', error: error.message });
  }
});

// DELETE uploaded installment document
router.post('/deleteupload', async (req, res) => {
  const { id } = req.body;
  const objectId = new mongoose.Types.ObjectId(id);

  try {
    const { Installment } = getModels(req);
    const updatedInstallment = await Installment.findByIdAndUpdate(objectId, {
      $unset: { installmentDocument: '' },
    });
    sendToClients(
      req.db, {
      type: 'installmentUpdated', // Custom event to signal data update
    });
    res.status(200).json(updatedInstallment);
  } catch (error) {
    res.status(500).json({ message: 'Error deleting document', error: error.message });
  }
});

// DELETE an installment by ID
router.delete('/:id', async (req, res) => {
  try {
    const { Installment, WeeklyInvoice, DayInvoice } = getModels(req);
    const installmentId = req.params.id;

    const installment = await Installment.findById(installmentId);
    if (!installment) {
      return res.status(404).json({ message: 'Installment not found' });
    }

    // Step 1: Find all WeeklyInvoices that include this installment
    const weeklyInvoices = await WeeklyInvoice.find({ installments: installmentId });

    for (const weekly of weeklyInvoices) {
      // Step 2: Remove the installment ID from the 'installments' array
      weekly.installments = weekly.installments.filter(id => id.toString() !== installmentId);

      // Step 3: Remove the installment's detail object from 'installmentDetail'
      weekly.installmentDetail = (weekly.installmentDetail || []).filter(
        detail => detail._id?.toString() !== installmentId
      );

      // Step 4: Recalculate the total
      const relatedDayInvoices = await DayInvoice.find({
        _id: { $in: weekly.invoices }
      });

      const calculateTotal = (inv) =>
        (inv.serviceRateforMain || 0) +
        (inv.byodRate || 0) +
        (inv.calculatedMileage || 0) +
        (inv.incentiveDetailforMain?.rate || 0);

      const weeklyRawTotal = relatedDayInvoices.reduce((sum, inv) => sum + calculateTotal(inv), 0);
      const totalInstallmentDeduction = weekly.installmentDetail.reduce(
        (sum, inst) => sum + (inst.deductionAmount || 0),
        0
      );
      const finalTotal = Math.max(0, weeklyRawTotal - totalInstallmentDeduction);

      weekly.total = finalTotal;
      weekly.unsigned = weekly.installmentDetail.some(d => !d.signed);

      await weekly.save();
    }

    // Step 5: Delete the Installment document itself
    await Installment.findByIdAndDelete(installmentId);

    // Step 6: Notify clients
    sendToClients(req.db, {
      type: 'installmentUpdated',
    });

    res.json({ message: 'Installment deleted successfully and WeeklyInvoices updated.' });
  } catch (error) {
    console.error('Error deleting installment:', error);
    res.status(500).json({ message: 'Error deleting installment', error: error.message });
  }
});


module.exports = router;