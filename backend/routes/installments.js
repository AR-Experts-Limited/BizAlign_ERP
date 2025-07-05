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
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const databaseName = req.db.db.databaseName
      const user_ID = req.body.user_ID;
      const date = new Date().toLocaleDateString()
      cb(null, `${databaseName}/Installments/${user_ID}/${date}/${file.originalname}`);
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png/;
      if (allowedTypes.test(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed.'));
      }
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

router.post('/', upload.any(), async (req, res) => {
  const {
    driverId, driverName, user_ID, installmentRate,
    tenure, site, installmentType, installmentPending,
    spreadRate, signed
  } = req.body;
  let { addedBy } = req.body;

  try {
    const { Installment, User, Notification, WeeklyInvoice, DayInvoice, Driver } = getModels(req);
    const doc = req.files[0]?.location || '';

    // Step 1: Create and save new Installment
    const newInstallment = new Installment({
      driverId,
      driverName,
      user_ID,
      installmentRate,
      tenure,
      site,
      installmentType,
      installmentPending: +parseFloat(installmentPending).toFixed(2),
      spreadRate: +parseFloat(spreadRate).toFixed(2),
      addedBy,
      signed,
      installmentDocument: doc,
    });
    await newInstallment.save();

    // Step 2: Fetch all current and future WeeklyInvoices for the driver and site
    const currentWeekFormatted = moment().format('GGGG-[W]WW');
    const futureInvoices = await WeeklyInvoice.find({
      driverId,
      serviceWeek: { $gte: currentWeekFormatted }
    }).sort({ serviceWeek: 1 });

    let pending = newInstallment.installmentPending;

    // Step 3: Process each WeeklyInvoice
    for (const invoice of futureInvoices) {
      if (pending <= 0) break;

      // Calculate weekly total before installments
      const dayInvoices = await DayInvoice.find({ _id: { $in: invoice.invoices } }).lean();
      const driver = await Driver.findById(invoice.driverId);

      let weeklyBaseTotal = 0;
      let weeklyVatTotal = 0;

      const isVatApplicable = (date) => {
        return (
          (driver?.vatDetails?.vatNo && date >= new Date(driver.vatDetails.vatEffectiveDate)) ||
          (driver?.companyVatDetails?.vatNo && date >= new Date(driver.companyVatDetails.companyVatEffectiveDate))
        );
      };

      // Sum DayInvoice totals
      for (const inv of dayInvoices) {
        const invBaseTotal = +parseFloat(inv.total || 0).toFixed(2);
        weeklyBaseTotal += invBaseTotal;
        if (isVatApplicable(new Date(inv.date))) {
          weeklyVatTotal += +parseFloat(invBaseTotal * 0.2).toFixed(2);
        }
      }

      // Add existing AdditionalCharges contributions
      let additionalChargesTotal = 0;
      for (const charge of invoice.additionalChargesDetail || []) {
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

      // Restore previous installment deductions
      const allInstallments = await Installment.find({ driverId });
      for (const detail of invoice.installmentDetail || []) {
        const inst = allInstallments.find((i) => i._id.toString() === detail._id?.toString());
        if (inst && detail.deductionAmount > 0) {
          inst.installmentPending = +parseFloat(inst.installmentPending + detail.deductionAmount).toFixed(2);
          await inst.save();
        }
      }

      // Calculate new installment deductions, including the new installment
      const installmentMap = new Map();
      let remainingTotal = weeklyTotalBeforeInstallments;

      // Include all installments, prioritizing the new one
      const installmentsToProcess = [
        newInstallment,
        ...allInstallments.filter((inst) => inst._id.toString() !== newInstallment._id.toString())
      ];

      for (const inst of installmentsToProcess) {
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

      // Update WeeklyInvoice
      await WeeklyInvoice.findByIdAndUpdate(
        invoice._id,
        {
          $set: {
            installments: mergedInstallments.map((inst) => inst._id),
            installmentDetail: mergedInstallments,
            total: finalWeeklyTotal,
            vatTotal: weeklyVatTotal,
          },
        },
        { new: true }
      );

      // Update pending amount for the new installment
      pending = newInstallment.installmentPending;
    }

    // Step 4: Notify user
    const user = await User.findOne({ user_ID });
    if (user?.expoPushTokens) {
      const expo = new Expo();
      const message = {
        to: user.expoPushTokens,
        title: 'New Installment Added',
        body: `A new installment has been added for ${driverName} at ${site}.`,
        data: { installmentId: newInstallment._id },
        isRead: false,
      };
      try {
        await expo.sendPushNotificationsAsync([message]);
      } catch (notificationError) {
        console.error('Error sending push notification:', notificationError.message);
      }
    }

    // Step 5: Save in-app notification
    const notification = new Notification({
      notification: {
        title: 'New Installment Added',
        user_ID,
        body: `A new installment has been added for ${driverName} at ${site}`,
        data: { installmentId: newInstallment._id },
        isRead: false,
      },
      targetDevice: 'app',
    });
    await notification.save();

    // Step 6: Notify clients
    sendToClients(req.db, { type: 'installmentUpdated' });

    res.status(201).json({ message: 'Installment added and distributed', installment: newInstallment });
  } catch (error) {
    console.error('Error adding installment:', error);
    res.status(500).json({ message: 'Error adding installment', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { Installment, WeeklyInvoice, DayInvoice, Driver } = getModels(req);
    const installmentId = req.params.id;

    // Step 1: Find and validate Installment
    const installment = await Installment.findById(installmentId);
    if (!installment) {
      return res.status(404).json({ message: 'Installment not found' });
    }
    await Installment.findByIdAndDelete(installmentId);

    // Step 2: Get WeeklyInvoices that included this installment
    const weeklyInvoices = await WeeklyInvoice.find({ installments: installmentId });

    // Step 3: Process each WeeklyInvoice
    for (const weekly of weeklyInvoices) {
      // Remove the installment from both arrays
      weekly.installments = weekly.installments.filter(id => id.toString() !== installmentId);
      weekly.installmentDetail = (weekly.installmentDetail || []).filter(
        detail => detail._id?.toString() !== installmentId
      );

      // Recalculate weekly totals before installments
      const relatedDayInvoices = await DayInvoice.find({ _id: { $in: weekly.invoices } }).lean();
      const driver = await Driver.findById(weekly.driverId);

      let weeklyBaseTotal = 0;
      let weeklyVatTotal = 0;

      const isVatApplicable = (date) => {
        return (
          (driver?.vatDetails?.vatNo && date >= new Date(driver.vatDetails.vatEffectiveDate)) ||
          (driver?.companyVatDetails?.vatNo && date >= new Date(driver.companyVatDetails.companyVatEffectiveDate))
        );
      };

      // Sum DayInvoice totals
      for (const inv of relatedDayInvoices) {
        const invBaseTotal = +parseFloat(inv.total || 0).toFixed(2);
        weeklyBaseTotal += invBaseTotal;
        if (isVatApplicable(new Date(inv.date))) {
          weeklyVatTotal += +parseFloat(invBaseTotal * 0.2).toFixed(2);
        }
      }

      // Add existing AdditionalCharges contributions
      let additionalChargesTotal = 0;
      for (const charge of weekly.additionalChargesDetail || []) {
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

      // Restore pending amounts for previous installment deductions
      const allInstallments = await Installment.find({ driverId: weekly.driverId });
      for (const detail of weekly.installmentDetail || []) {
        const inst = allInstallments.find((i) => i._id.toString() === detail._id?.toString());
        if (inst && detail.deductionAmount > 0) {
          inst.installmentPending = +parseFloat(inst.installmentPending + detail.deductionAmount).toFixed(2);
          await inst.save();
        }
      }

      // Recalculate deductions from all driver installments
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

      // Update WeeklyInvoice
      await WeeklyInvoice.findByIdAndUpdate(
        weekly._id,
        {
          $set: {
            installmentDetail: mergedInstallments,
            installments: mergedInstallments.map((inst) => inst._id),
            total: finalWeeklyTotal,
            vatTotal: weeklyVatTotal,
          },
        },
        { new: true }
      );
    }


    // Step 5: Notify clients
    sendToClients(req.db, { type: 'installmentUpdated' });

    res.json({ message: 'Installment deleted successfully and WeeklyInvoices updated.' });
  } catch (error) {
    console.error('Error deleting installment:', error);
    res.status(500).json({ message: 'Error deleting installment', error: error.message });
  }
});

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



module.exports = router;