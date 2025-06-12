const express = require('express');
const { Expo } = require('expo-server-sdk');
const multer = require('multer'); // To handle file uploads
const router = express.Router();
const mongoose = require('mongoose');
const multerS3 = require('multer-s3');
const { sendToClients } = require('../utils/sseService');
const s3 = require('./aws'); // Optional: To delete files from file system

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    contentDisposition: 'inline',
    key: (req, file, cb) => {
      const deductionDriverId = req.body.driverId;
      const databaseName = req.db.db.databaseName
      const deductionDate = String(new Date(req.body.date).toISOString());
      cb(null, `${databaseName}/Deductions/${Date.now()}/${deductionDriverId}/${deductionDate}/${file.originalname}`);
    },
  }),
});

// Helper function to get models from req.db
const getModels = (req) => ({
  Deduction: req.db.model('Deduction', require('../models/deductions').schema),
  Driver: req.db.model('Driver', require('../models/Driver').schema),
  DayInvoice: req.db.model('DayInvoice', require('../models/DayInvoice').schema),
  WeeklyInvoice: req.db.model('WeeklyInvoice', require('../models/weeklyInvoice').schema),
  User: req.db.model('User', require('../models/User').schema),
  Notification: req.db.model('Notification', require('../models/notifications').schema),
  Installment: req.db.model('Installment', require('../models/installments').schema),
});

// GET all deductions (with optional filtering by site)
//router.get('/', async (req, res) => {
//  const { site } = req.query; // Optional query parameter for site filtering
//  try {
//    const { Deduction } = getModels(req);
//    const query = site ? { site } : {}; // Filter by site if provided
//    const deductions = await Deduction.find(query);
//    res.json(deductions);
//  } catch (error) {
//    console.error('Error fetching deductions:', error);
//    res.status(500).json({ message: 'Error fetching deductions', error: error.message });
//  }
//});

//Get Deductions where Driver is not Disabled
router.get('/', async (req, res) => {
  const { site } = req.query; // Optional site filter

  try {
    const { Deduction, Driver } = getModels(req); // Ensure both models are registered

    // Step 1: Fetch all deductions (optionally filtered by site)
    const query = site ? { site } : {};
    const deductions = await Deduction.find(query);

    // Step 2: Get all driverIds from those deductions
    const driverIds = deductions.map(d => d.driverId);

    // Step 3: Fetch only disabled drivers (opposite of before)
    const disabledDrivers = await Driver.find({
      _id: { $in: driverIds },
      disabled: true
    });

    const disabledDriverIds = new Set(disabledDrivers.map(d => d._id.toString()));

    // Step 4: Filter out deductions linked to explicitly disabled drivers
    const filteredDeductions = deductions.filter(d =>
      !disabledDriverIds.has(d.driverId.toString())
    );

    res.status(200).json(filteredDeductions);
  } catch (error) {
    console.error('Error fetching deductions:', error);
    res.status(500).json({ message: 'Error fetching deductions', error: error.message });
  }
});

// GET deductions filtered by driverId and date
router.get('/filter', async (req, res) => {
  const { driverId, date } = req.query;
  try {
    const { Deduction } = getModels(req);
    const deductions = await Deduction.find({ driverId, date });
    res.json(deductions);
  } catch (error) {
    console.error('Error fetching deductions:', error);
    res.status(500).json({ message: 'Error fetching deductions', error: error.message });
  }
});

// GET deductions filtered by site and ISO week (YYYY-W##)
router.get('/by-site-week', async (req, res) => {
  const { site, serviceWeek } = req.query;

  if (!site || !serviceWeek) {
    return res.status(400).json({ message: "Both 'site' and 'serviceWeek' are required." });
  }

  try {
    const { Deduction } = getModels(req);
    const [year, weekStr] = serviceWeek.split("-W");
    const week = parseInt(weekStr, 10);
    const startDate = getDateOfISOWeek(week, parseInt(year));
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);

    // Query for deductions that fall in that week
    const deductions = await Deduction.find({
      site,
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    });

    res.status(200).json(deductions);
  } catch (error) {
    console.error("Error fetching deductions for site and week:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// Helper: convert ISO week to date
function getDateOfISOWeek(week, year) {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4)
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  return ISOweekStart;
}

// GET deductions for a specific driver
router.get('/driverspecific', async (req, res) => {
  const { driverId } = req.query;
  try {
    const { Deduction } = getModels(req);
    const deductions = await Deduction.find({ driverId });
    res.json(deductions);
  } catch (error) {
    console.error('Error fetching deductions:', error);
    res.status(500).json({ message: 'Error fetching deductions', error: error.message });
  }
});

// POST a new deduction
router.post('/', upload.any(), async (req, res) => {
  const { site, driverId, user_ID, driverName, serviceType, rate, date, signed, week } = req.body;
  let { addedBy } = req.body;

  try {
    const { Deduction, DayInvoice, WeeklyInvoice, Installment, User, Notification } = getModels(req);
    const doc = req.files[0]?.location || '';

    // Step 1: Create and save Deduction
    const newDeduction = new Deduction({
      site,
      driverId,
      user_ID,
      driverName,
      serviceType,
      rate: parseFloat(rate),
      date,
      signed,
      deductionDocument: doc,
      addedBy,
      week
    });
    await newDeduction.save();

    // Step 2: Attach deduction to the corresponding DayInvoice
    const dayInvoice = await DayInvoice.findOne({ driverId, date, site });
    if (dayInvoice) {


      // Add deduction and subtract rate from total
      dayInvoice.deductionDetail.push(newDeduction);
      dayInvoice.total = +(dayInvoice.total - newDeduction.rate).toFixed(2);
      await dayInvoice.save();

      // Step 3: Update related WeeklyInvoice
      const { serviceWeek } = dayInvoice;
      const weeklyInvoice = await WeeklyInvoice.findOne({ driverId, serviceWeek });
      if (weeklyInvoice) {
        // Step 4: Recalculate based on updated DayInvoices
        const allDayInvoices = await DayInvoice.find({ driverId, serviceWeek, site });
        const weeklyRawTotal = allDayInvoices.reduce((sum, inv) => sum + inv.total, 0);

        // Step 5: Restore old installment deductions
        for (const detail of weeklyInvoice.installmentDetail || []) {
          const inst = await Installment.findById(detail._id);
          if (!inst) continue;
          inst.installmentPending += detail.deductionAmount || 0;
          await inst.save();
        }

        // Step 6: Recalculate installments
        const allInstallments = await Installment.find({ driverId });
        let remainingTotal = weeklyRawTotal;
        const updatedInstallmentDetail = [];

        for (const inst of allInstallments) {
          if (inst.installmentPending <= 0) continue;

          const deductionAmount = Math.min(inst.spreadRate, inst.installmentPending, remainingTotal);
          if (deductionAmount <= 0) continue;

          inst.installmentPending -= deductionAmount;
          remainingTotal -= deductionAmount;
          await inst.save();

          updatedInstallmentDetail.push({
            _id: inst._id,
            installmentRate: inst.installmentRate,
            installmentType: inst.installmentType,
            installmentDocument: inst.installmentDocument,
            deductionAmount,
            signed: inst.signed,
          });
        }

        const totalInstallmentDeduction = updatedInstallmentDetail.reduce(
          (sum, i) => sum + (i.deductionAmount || 0),
          0
        );
        const finalTotal = Math.max(0, weeklyRawTotal - totalInstallmentDeduction);

        // Step 7: Update WeeklyInvoice
        weeklyInvoice.total = finalTotal;
        weeklyInvoice.installmentDetail = updatedInstallmentDetail;
        weeklyInvoice.unsigned = updatedInstallmentDetail.some(i => !i.signed);
        await weeklyInvoice.save();
      }
    }
    // Step 8: Notify user with push notification
    const user = await User.findOne({ user_ID });
    if (user?.expoPushTokens) {
      const expo = new Expo();
      const message = {
        to: user.expoPushTokens,
        title: 'New Deduction Added',
        body: `A new deduction has been added for ${driverName} at ${site}`,
        data: { deductionId: newDeduction._id },
        isRead: false,
      };

      try {
        await expo.sendPushNotificationsAsync([message]);
      } catch (notificationError) {
        console.error('Push notification failed:', notificationError.message);
      }
    }

    // Step 9: Save notification
    const notification = new Notification({
      title: 'New Deduction Added',
      user_ID,
      body: `A new deduction has been added for ${driverName} at ${site}`,
      data: { deductionId: newDeduction._id },
      isRead: false,
      targetDevice: 'app',
    });
    await notification.save();

    // Step 10: Notify frontend
    sendToClients(req.db, {
      type: 'deductionUpdated',
    });

    res.status(201).json(newDeduction);
  } catch (error) {
    console.error('Error adding deduction:', error);
    res.status(500).json({ message: 'Error adding deduction', error: error.message });
  }
});

// POST upload deduction document
router.post('/docupload', upload.any(), async (req, res) => {
  const { _id } = req.body;
  const objectId = new mongoose.Types.ObjectId(_id);

  try {
    const { Deduction } = getModels(req);
    const doc = req.files[0]?.location || '';
    const updatedDeduction = await Deduction.findByIdAndUpdate(objectId, {
      $set: { deductionDocument: doc },
    });
    sendToClients(
      req.db, {
      type: 'deductionUpdated', // Custom event to signal data update
    });
    res.status(200).json(updatedDeduction);
  } catch (error) {
    res.status(500).json({ message: 'Error uploading document', error: error.message });
  }
});

// DELETE uploaded deduction document
router.post('/deleteupload', async (req, res) => {
  const { id } = req.body;
  const objectId = new mongoose.Types.ObjectId(id);

  try {
    const { Deduction } = getModels(req);
    const updatedDeduction = await Deduction.findByIdAndUpdate(objectId, {
      $unset: { deductionDocument: '' },
    });
    sendToClients(
      req.db, {
      type: 'deductionUpdated', // Custom event to signal data update
    });
    res.status(200).json(updatedDeduction);
  } catch (error) {
    res.status(500).json({ message: 'Error deleting document', error: error.message });
  }
});

// DELETE a deduction by ID
router.delete('/:id', async (req, res) => {
  try {
    const { Deduction, DayInvoice, WeeklyInvoice, Installment } = getModels(req);
    const deductionId = req.params.id;

    const deduction = await Deduction.findById(deductionId);
    if (!deduction) {
      return res.status(404).json({ message: 'Deduction not found' });
    }

    // Step 1: Update DayInvoice (remove deduction and restore its value to total)
    const dayInvoice = await DayInvoice.findOne({
      driverId: deduction.driverId,
      date: deduction.date,
      'deductionDetail._id': new mongoose.Types.ObjectId(deductionId),
    });

    if (!dayInvoice) {
      await Deduction.findByIdAndDelete(deductionId);
      return res.status(200).json({ message: 'Deduction deleted, no DayInvoice found' });
    }

    dayInvoice.deductionDetail = dayInvoice.deductionDetail.filter(
      d => d._id?.toString() !== deductionId
    );
    dayInvoice.total = +(dayInvoice.total + deduction.rate).toFixed(2);
    await dayInvoice.save();

    // Step 2: Get related WeeklyInvoice
    const { driverId, serviceWeek, site } = dayInvoice;
    const weeklyInvoice = await WeeklyInvoice.findOne({ driverId, serviceWeek });
    if (!weeklyInvoice) {
      await Deduction.findByIdAndDelete(deductionId);
      return res.status(200).json({ message: 'Deduction deleted. No weekly invoice to update' });
    }

    // Step 3: Recalculate weekly total
    const allDayInvoices = await DayInvoice.find({ driverId, serviceWeek, site });
    const weeklyRawTotal = allDayInvoices.reduce((sum, inv) => sum + inv.total, 0);


    // Step 5: Recalculate installment allocation
    const allInstallments = await Installment.find({ driverId });
    let remainingTotal = weeklyRawTotal;
    const updatedInstallmentDetail = [];

    console.log('remainingTotal:', remainingTotal)
    for (const inst of allInstallments) {
      if (inst.installmentPending <= 0) continue;

      const deductionAmount = Math.min(inst.spreadRate, inst.installmentPending, remainingTotal);
      if (deductionAmount <= 0) continue;

      inst.installmentPending -= deductionAmount;
      remainingTotal -= deductionAmount;
      await inst.save();

      updatedInstallmentDetail.push({
        _id: inst._id,
        installmentRate: inst.installmentRate,
        installmentType: inst.installmentType,
        installmentDocument: inst.installmentDocument,
        deductionAmount,
        signed: inst.signed,
      });
    }

    const totalInstallmentDeduction = updatedInstallmentDetail.reduce(
      (sum, i) => sum + (i.deductionAmount || 0),
      0
    );
    const finalTotal = Math.max(0, weeklyRawTotal - totalInstallmentDeduction);

    // Step 6: Update WeeklyInvoice
    weeklyInvoice.total = finalTotal;
    weeklyInvoice.installmentDetail = updatedInstallmentDetail;
    weeklyInvoice.unsigned = updatedInstallmentDetail.some(i => !i.signed);
    await weeklyInvoice.save();

    // Step 7: Delete the Deduction
    await Deduction.findByIdAndDelete(deductionId);

    // Step 8: Notify clients
    sendToClients(req.db, {
      type: 'deductionUpdated',
    });

    res.status(200).json({ message: 'Deduction deleted and installments recalculated' });
  } catch (error) {
    console.error('Error deleting deduction:', error);
    res.status(500).json({ message: 'Error deleting deduction', error: error.message });
  }
});



module.exports = router;