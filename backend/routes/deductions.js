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
  Installment: req.db.model('Installment', require('../models/installments').schema),
  User: req.db.model('User', require('../models/User').schema),
  Notification: req.db.model('Notification', require('../models/notifications').schema),
  Driver: req.db.model('Driver', require('../models/Driver').schema),
});

router.post('/', upload.any(), async (req, res) => {
  const { site, driverId, user_ID, driverName, serviceType, rate, date, signed, week } = req.body;
  let { addedBy } = req.body;

  try {
    const { Deduction, DayInvoice, WeeklyInvoice, Installment, User, Notification, Driver } = getModels(req);
    const doc = req.files[0]?.location || '';

    // Step 1: Create and save Deduction
    const newDeduction = new Deduction({
      site,
      driverId,
      user_ID,
      driverName,
      serviceType,
      rate: +parseFloat(rate).toFixed(2),
      date,
      signed,
      deductionDocument: doc,
      addedBy,
      week,
    });
    await newDeduction.save();

    // Step 2: Attach deduction to DayInvoice
    const dayInvoice = await DayInvoice.findOne({ driverId, date, site });
    if (!dayInvoice) {
      await Deduction.findByIdAndDelete(newDeduction._id);
      return res.status(404).json({ message: 'DayInvoice not found for the specified driver, date, and site' });
    }

    dayInvoice.deductionDetail = dayInvoice.deductionDetail || [];
    dayInvoice.deductionDetail.push({
      _id: newDeduction._id,
      driverId,
      user_ID,
      date,
      driverName,
      site,
      serviceType: newDeduction.serviceType,
      rate: newDeduction.rate,
      signed: newDeduction.signed,
      deductionDocument: newDeduction.deductionDocument,
    });
    dayInvoice.total = +Math.max(0, parseFloat(dayInvoice.total - newDeduction.rate).toFixed(2));
    await dayInvoice.save();

    // Step 3: Update WeeklyInvoice
    const { serviceWeek } = dayInvoice;
    const weeklyInvoice = await WeeklyInvoice.findOne({ driverId, serviceWeek });
    if (!weeklyInvoice) {
      await Deduction.findByIdAndDelete(newDeduction._id);
      await DayInvoice.findByIdAndUpdate(dayInvoice._id, {
        $pull: { deductionDetail: { _id: newDeduction._id } },
        $inc: { total: newDeduction.rate },
      });
      return res.status(404).json({ message: 'WeeklyInvoice not found' });
    }

    // Step 4: Recalculate WeeklyInvoice totals
    const allDayInvoices = await DayInvoice.find({
      _id: { $in: weeklyInvoice.invoices },
    }).lean();
    const driver = await Driver.findById(driverId);

    let weeklyBaseTotal = 0;
    let weeklyVatTotal = 0;

    const isVatApplicable = (date) => {
      return (
        (driver?.vatDetails?.vatNo && date >= new Date(driver.vatDetails.vatEffectiveDate)) ||
        (driver?.companyVatDetails?.vatNo && date >= new Date(driver.companyVatDetails.companyVatEffectiveDate))
      );
    };

    // Sum DayInvoice totals
    for (const inv of allDayInvoices) {
      const invBaseTotal = +parseFloat(inv.total || 0).toFixed(2);
      weeklyBaseTotal += invBaseTotal;
      if (isVatApplicable(new Date(inv.date))) {
        weeklyVatTotal += +parseFloat(invBaseTotal * 0.2).toFixed(2);
      }
    }

    // Add existing AdditionalCharges contributions
    let additionalChargesTotal = 0;
    for (const charge of weeklyInvoice.additionalChargesDetail || []) {
      let rateAdjustment = charge.rate;
      if (charge.type === 'deduction') {
        rateAdjustment = -rateAdjustment;
      }
      additionalChargesTotal += +parseFloat(rateAdjustment).toFixed(2);
      if (isVatApplicable(new Date(charge.week))) {
        weeklyVatTotal += +parseFloat(rateAdjustment * 0.2).toFixed(2);
      }
    }

    weeklyBaseTotal = +parseFloat(weeklyBaseTotal + additionalChargesTotal).toFixed(2);
    weeklyVatTotal = +parseFloat(weeklyVatTotal).toFixed(2);
    const weeklyTotalBeforeInstallments = +parseFloat(weeklyBaseTotal + weeklyVatTotal).toFixed(2);

    // Step 5: Restore previous installment deductions
    const allInstallments = await Installment.find({ driverId });
    for (const detail of weeklyInvoice.installmentDetail || []) {
      const inst = allInstallments.find((i) => i._id.toString() === detail._id?.toString());
      if (inst && detail.deductionAmount > 0) {
        inst.installmentPending = +parseFloat(inst.installmentPending + detail.deductionAmount).toFixed(2);
        await inst.save();
      }
    }

    // Step 6: Recalculate installment deductions
    const installmentMap = new Map();
    let remainingTotal = weeklyTotalBeforeInstallments;

    for (const inst of allInstallments) {
      const instId = inst._id.toString();
      if (inst.installmentPending <= 0) continue;

      const deduction = Math.min(
        +parseFloat(inst.spreadRate).toFixed(2),
        +parseFloat(inst.installmentPending).toFixed(2),
        remainingTotal
      );
      if (deduction <= 0) continue;

      inst.installmentPending = +parseFloat(inst.installmentPending - deduction).toFixed(2);
      await inst.save();

      installmentMap.set(instId, {
        _id: inst._id,
        installmentRate: inst.installmentRate,
        installmentType: inst.installmentType,
        installmentDocument: inst.installmentDocument,
        installmentPending: inst.installmentPending,
        deductionAmount: +parseFloat(deduction).toFixed(2),
        signed: inst.signed,
      });

      remainingTotal = +parseFloat(remainingTotal - deduction).toFixed(2);
    }

    const mergedInstallments = Array.from(installmentMap.values());
    const totalInstallmentDeduction = +parseFloat(
      mergedInstallments.reduce((sum, inst) => sum + (inst.deductionAmount || 0), 0)
    ).toFixed(2);

    const finalWeeklyTotal = +Math.max(0, parseFloat(weeklyTotalBeforeInstallments - totalInstallmentDeduction).toFixed(2));

    // Step 7: Update WeeklyInvoice
    await WeeklyInvoice.findByIdAndUpdate(
      weeklyInvoice._id,
      {
        $set: {
          total: finalWeeklyTotal,
          vatTotal: weeklyVatTotal,
          installmentDetail: mergedInstallments,
          installments: mergedInstallments.map((inst) => inst._id),
        },
      },
      { new: true }
    );

    // Step 8: Notify user
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
      notification: {
        title: 'New Deduction Added',
        user_ID,
        body: `A new deduction has been added for ${driverName} at ${site}`,
        data: { deductionId: newDeduction._id },
        isRead: false,
      },
      targetDevice: 'app',
    });
    await notification.save();

    // Step 10: Notify frontend
    sendToClients(req.db, { type: 'deductionUpdated' });

    res.status(201).json(newDeduction);
  } catch (error) {
    console.error('Error adding deduction:', error);
    res.status(500).json({ message: 'Error adding deduction', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { Deduction, DayInvoice, WeeklyInvoice, Installment, Driver } = getModels(req);
    const deductionId = req.params.id;

    const deduction = await Deduction.findById(deductionId);
    if (!deduction) {
      return res.status(404).json({ message: 'Deduction not found' });
    }

    // Step 1: Remove deduction from DayInvoice and restore its amount
    const dayInvoice = await DayInvoice.findOne({
      driverId: deduction.driverId,
      date: deduction.date,
      'deductionDetail._id': new mongoose.Types.ObjectId(deductionId),
    });

    if (!dayInvoice) {
      await Deduction.findByIdAndDelete(deductionId);
      return res.status(200).json({ message: 'Deduction deleted, no DayInvoice found' });
    }

    // Remove deduction and update total
    dayInvoice.deductionDetail = dayInvoice.deductionDetail.filter(
      (d) => d._id?.toString() !== deductionId
    );
    dayInvoice.total = +parseFloat(dayInvoice.total + deduction.rate).toFixed(2);
    await dayInvoice.save();

    // Step 2: Recalculate WeeklyInvoice
    const { driverId, serviceWeek } = dayInvoice;
    const weeklyInvoice = await WeeklyInvoice.findOne({ driverId, serviceWeek });
    if (!weeklyInvoice) {
      await Deduction.findByIdAndDelete(deductionId);
      return res.status(200).json({ message: 'Deduction deleted, no WeeklyInvoice found' });
    }

    // Step 3: Recalculate totals from all DayInvoices and existing AdditionalCharges
    const allDayInvoices = await DayInvoice.find({
      _id: { $in: weeklyInvoice.invoices },
    }).lean();
    const driver = await Driver.findById(driverId);

    let weeklyBaseTotal = 0;
    let weeklyVatTotal = 0;

    const isVatApplicable = (date) => {
      return (
        (driver?.vatDetails?.vatNo && date >= new Date(driver.vatDetails.vatEffectiveDate)) ||
        (driver?.companyVatDetails?.vatNo && date >= new Date(driver.companyVatDetails.companyVatEffectiveDate))
      );
    };

    // Sum DayInvoice totals
    for (const inv of allDayInvoices) {
      const invBaseTotal = +parseFloat(inv.total || 0).toFixed(2);
      weeklyBaseTotal += invBaseTotal;
      if (isVatApplicable(new Date(inv.date))) {
        weeklyVatTotal += +parseFloat(invBaseTotal * 0.2).toFixed(2);
      }
    }

    // Add existing AdditionalCharges contributions
    let additionalChargesTotal = 0;
    for (const charge of weeklyInvoice.additionalChargesDetail || []) {
      let rateAdjustment = charge.rate;
      if (charge.type === 'deduction') {
        rateAdjustment = -rateAdjustment;
      }
      additionalChargesTotal += +parseFloat(rateAdjustment).toFixed(2);
      if (isVatApplicable(new Date(charge.week))) {
        weeklyVatTotal += +parseFloat(rateAdjustment * 0.2).toFixed(2);
      }
    }

    weeklyBaseTotal = +parseFloat(weeklyBaseTotal + additionalChargesTotal).toFixed(2);
    weeklyVatTotal = +parseFloat(weeklyVatTotal).toFixed(2);
    const weeklyTotalBeforeInstallments = +parseFloat(weeklyBaseTotal + weeklyVatTotal).toFixed(2);

    // Step 4: Restore previous installment deductions
    const allInstallments = await Installment.find({ driverId });
    for (const detail of weeklyInvoice.installmentDetail || []) {
      const inst = allInstallments.find((i) => i._id.toString() === detail._id?.toString());
      if (inst && detail.deductionAmount > 0) {
        inst.installmentPending = +parseFloat(inst.installmentPending + detail.deductionAmount).toFixed(2);
        await inst.save();
      }
    }

    // Step 5: Recalculate installment deductions
    const installmentMap = new Map();
    let remainingTotal = weeklyTotalBeforeInstallments;

    for (const inst of allInstallments) {
      const instId = inst._id.toString();
      if (inst.installmentPending <= 0) continue;

      const deduction = Math.min(
        +parseFloat(inst.spreadRate).toFixed(2),
        +parseFloat(inst.installmentPending).toFixed(2),
        remainingTotal
      );
      if (deduction <= 0) continue;

      inst.installmentPending = +parseFloat(inst.installmentPending - deduction).toFixed(2);
      await inst.save();

      installmentMap.set(instId, {
        _id: inst._id,
        installmentRate: inst.installmentRate,
        installmentType: inst.installmentType,
        installmentDocument: inst.installmentDocument,
        installmentPending: inst.installmentPending,
        deductionAmount: +parseFloat(deduction).toFixed(2),
        signed: inst.signed,
      });

      remainingTotal = +parseFloat(remainingTotal - deduction).toFixed(2);
    }

    const mergedInstallments = Array.from(installmentMap.values());
    const totalInstallmentDeduction = +parseFloat(
      mergedInstallments.reduce((sum, inst) => sum + (inst.deductionAmount || 0), 0)
    ).toFixed(2);

    const finalWeeklyTotal = +Math.max(0, parseFloat(weeklyTotalBeforeInstallments - totalInstallmentDeduction).toFixed(2));

    // Step 6: Update WeeklyInvoice
    await WeeklyInvoice.findByIdAndUpdate(
      weeklyInvoice._id,
      {
        $set: {
          total: finalWeeklyTotal,
          vatTotal: weeklyVatTotal,
          installmentDetail: mergedInstallments,
          installments: mergedInstallments.map((inst) => inst._id),
        },
      },
      { new: true }
    );

    // Step 7: Delete the deduction
    await Deduction.findByIdAndDelete(deductionId);

    // Step 8: Notify frontend
    sendToClients(req.db, { type: 'deductionUpdated' });

    res.status(200).json({ message: 'Deduction deleted and installments recalculated' });
  } catch (error) {
    console.error('Error deleting deduction:', error);
    res.status(500).json({ message: 'Error deleting deduction', error: error.message });
  }
});



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





module.exports = router;