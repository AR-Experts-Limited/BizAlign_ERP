const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const multer = require('multer'); // To handle file uploads
const multerS3 = require('multer-s3');
const s3 = require('./aws'); // Optional: To delete files from file system
const { Expo } = require('expo-server-sdk');
const { sendToClients } = require('../utils/sseService');
const nodemailer = require('nodemailer');
const DayInvoice = require('../models/DayInvoice');

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    contentDisposition: 'inline',
    key: (req, file, cb) => {
      const user_ID = req.body.user_ID;
      const databaseName = req.db.db.databaseName
      cb(null, `${databaseName}/${user_ID}/payslips/${file.originalname}`);
    },
  }),
});

// Helper function to get models from req.db
const getModels = (req) => ({
  DayInvoice: req.db.model('DayInvoice', require('../models/DayInvoice').schema),
  WeeklyInvoice: req.db.model('WeeklyInvoice', require('../models/weeklyInvoice').schema),
  Installment: req.db.model('Installment', require('../models/installments').schema),
  User: req.db.model('User', require('../models/User').schema),
  Notification: req.db.model('Notification', require('../models/notifications').schema),
  IdCounter: req.db.model('IdCounter', require('../models/IdCounter').schema),
  Driver: req.db.model('Driver', require('../models/Driver').schema),
  AdditionalCharges: req.db.model('AdditionalCharges', require('../models/additionalCharges').schema),
});


router.post('/', async (req, res) => {
  try {
    const { DayInvoice, IdCounter, WeeklyInvoice, Installment, Driver, AdditionalCharges } = getModels(req);
    const {
      driverId, serviceWeek, site, driverEmail, driverVehicleType, driverName,
      invoiceGeneratedBy, standbyService, date, total
    } = req.body;

    if (!driverId || !serviceWeek || !site) {
      return res.status(400).json({ message: 'driverId, serviceWeek, and site are required' });
    }

    const currentDate = new Date(date);
    const driverData = await Driver.findById(driverId);

    // Generate invoice and reference numbers
    const invoiceCounter = await IdCounter.findOneAndUpdate(
      { idType: 'InvoiceNumber' },
      { $inc: { counterValue: 1 } },
      { new: true, upsert: true }
    );

    const existingInvoices = await DayInvoice.find({ driverId, serviceWeek });
    let referenceNumber;
    if (existingInvoices.length > 0) {
      referenceNumber = existingInvoices[0]?.referenceNumber || 0;
    } else {
      const referenceCounter = await IdCounter.findOneAndUpdate(
        { idType: 'ReferenceNumber' },
        { $inc: { counterValue: 1 } },
        { new: true, upsert: true }
      );
      referenceNumber = referenceCounter.counterValue;
    }

    // Round base total to 2 decimals
    const baseTotal = +parseFloat(total).toFixed(2);

    // Create and save new DayInvoice
    const newInvoice = new DayInvoice({
      ...req.body,
      invoiceNumber: invoiceCounter.counterValue,
      referenceNumber,
      invoiceGeneratedOn: new Date(),
      total: baseTotal,
    });
    await newInvoice.save();

    // Add newInvoice to WeeklyInvoice
    const weeklyInvoice = await WeeklyInvoice.findOneAndUpdate(
      { driverId, serviceWeek },
      {
        $addToSet: { invoices: newInvoice._id },
        $inc: { count: 1 },
        $set: {
          driverId,
          driverEmail: driverEmail || newInvoice.driverEmail,
          driverVehicleType: driverVehicleType || newInvoice.driverVehicleType,
          driverName: driverName || newInvoice.driverName,
          invoiceGeneratedBy: invoiceGeneratedBy || newInvoice.invoiceGeneratedBy,
          invoiceGeneratedOn: currentDate,
          standbyService: standbyService || newInvoice.standbyService,
          referenceNumber: newInvoice.referenceNumber,
          site,
        },
      },
      { upsert: true, new: true }
    );

    // Check for existing AdditionalCharges
    const additionalCharges = await AdditionalCharges.find({ driverId, week: serviceWeek });
    if (additionalCharges.length > 0) {
      weeklyInvoice.additionalChargesDetail = weeklyInvoice.additionalChargesDetail || [];
      const existingChargeIds = new Set(
        weeklyInvoice.additionalChargesDetail.map((c) => c._id.toString())
      );
      additionalCharges.forEach((charge) => {
        if (!existingChargeIds.has(charge._id.toString())) {
          weeklyInvoice.additionalChargesDetail.push({
            _id: charge._id,
            driverId: charge.driverId,
            driverName: charge.driverName,
            site: charge.site,
            week: charge.week,
            title: charge.title,
            type: charge.type,
            rate: +parseFloat(charge.rate).toFixed(2),
          });
        }
      });
    }

    // Calculate weekly total before installments
    const allInvoices = await DayInvoice.find({ driverId, serviceWeek }).lean();
    let weeklyBaseTotal = 0;
    let weeklyVatTotal = 0;

    const isVatApplicable = (date) => {
      return (
        (driverData?.vatDetails?.vatNo && date >= new Date(driverData.vatDetails.vatEffectiveDate)) ||
        (driverData?.companyVatDetails?.vatNo && date >= new Date(driverData.companyVatDetails.companyVatEffectiveDate))
      );
    };

    // Sum DayInvoice totals
    for (const inv of allInvoices) {
      const invBaseTotal = +parseFloat(inv.total || 0).toFixed(2);
      weeklyBaseTotal += invBaseTotal;
      if (isVatApplicable(new Date(inv.date))) {
        weeklyVatTotal += +parseFloat(invBaseTotal * 0.2).toFixed(2);
      }
    }

    // Add AdditionalCharges contributions
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

    // Restore previous installment deductions
    const allInstallments = await Installment.find({ driverId });
    for (const detail of weeklyInvoice.installmentDetail || []) {
      const inst = allInstallments.find((i) => i._id.toString() === detail._id?.toString());
      if (inst && detail.deductionAmount > 0) {
        inst.installmentPending = +parseFloat(inst.installmentPending + detail.deductionAmount).toFixed(2);
        await inst.save();
      }
    }

    // Calculate new installment deductions
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

    // Update WeeklyInvoice with final totals, installments, and installment IDs
    await WeeklyInvoice.findOneAndUpdate(
      { driverId, serviceWeek },
      {
        $set: {
          vatTotal: weeklyVatTotal,
          total: finalWeeklyTotal,
          installmentDetail: mergedInstallments,
          installments: mergedInstallments.map((inst) => inst._id),
          additionalChargesDetail: weeklyInvoice.additionalChargesDetail,
        },
      },
      { new: true }
    );

    sendToClients(req.db, { type: 'rotaAdded', data: newInvoice });
    res.status(200).json(newInvoice);
  } catch (error) {
    console.error('Error saving invoice:', error);
    res.status(500).json({ message: 'Error saving invoice', error: error.message });
  }
});

// Route for batch updating approval status
router.put('/updateApprovalStatusBatch', async (req, res) => {
  const { updates } = req.body;

  try {
    const { DayInvoice } = getModels(req);

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: 'Invalid input: updates must be a non-empty array' });
    }

    const bulkOps = updates.map(({ id, updateData }) => ({
      updateOne: {
        filter: { _id: new mongoose.Types.ObjectId(id) },
        update: { $set: updateData },
      },
    }));

    const result = await DayInvoice.bulkWrite(bulkOps);

    // Fetch updated documents after bulkWrite
    const updatedDocs = await DayInvoice.find({ _id: { $in: updates.map(({ id, updateData }) => id) } });

    res.status(200).json({ message: 'Invoices updated successfully', result, updated: updatedDocs });
    sendToClients(
      req.db, {
      type: 'approvalStatusUpdated', // Custom event to signal data update
      data: updatedDocs
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating invoices', error: error.message });
  }
});

router.put('/:invoiceId', async (req, res) => {
  const round2 = (num) => +parseFloat(num).toFixed(2);

  try {
    const { DayInvoice, WeeklyInvoice, Installment, Driver, AdditionalCharges } = getModels(req);
    const { invoiceId } = req.params;
    const {
      serviceRateforMain, byodRate, calculatedMileage, incentiveDetailforMain,
      serviceRateforAdditional, driverId, serviceWeek, site, date, additionalServiceDetails, total
    } = req.body;

    if (!invoiceId || !driverId || !serviceWeek || !site) {
      return res.status(400).json({ message: 'invoiceId, driverId, serviceWeek, and site are required' });
    }

    const driverData = await Driver.findById(driverId);
    const invoiceToUpdate = await DayInvoice.findById(invoiceId);
    if (!invoiceToUpdate) return res.status(404).json({ message: 'Invoice not found' });

    // Update the invoice
    const updatedBaseTotal = round2(total);
    Object.assign(invoiceToUpdate, {
      ...req.body,
      total: updatedBaseTotal,
      additionalServiceDetails,
      invoiceUpdatedOn: new Date(),
    });
    await invoiceToUpdate.save();

    // Fetch WeeklyInvoice
    const weeklyInvoice = await WeeklyInvoice.findOne({ driverId, serviceWeek });
    if (!weeklyInvoice) {
      return res.status(404).json({ message: 'WeeklyInvoice not found' });
    }

    // Calculate weekly total before installments
    const allInvoices = await DayInvoice.find({ driverId, serviceWeek }).lean();
    let weeklyBaseTotal = 0;
    let weeklyVatTotal = 0;

    const isVatApplicable = (date) => {
      return (
        (driverData?.vatDetails?.vatNo && date >= new Date(driverData.vatDetails.vatEffectiveDate)) ||
        (driverData?.companyVatDetails?.vatNo && date >= new Date(driverData.companyVatDetails.companyVatEffectiveDate))
      );
    };

    // Sum DayInvoice totals
    for (const inv of allInvoices) {
      const invBaseTotal = round2(inv.total || 0);
      weeklyBaseTotal += invBaseTotal;
      if (isVatApplicable(new Date(inv.date))) {
        weeklyVatTotal += round2(invBaseTotal * 0.2);
      }
    }

    // Add AdditionalCharges contributions
    let additionalChargesTotal = 0;
    for (const charge of weeklyInvoice.additionalChargesDetail || []) {
      let rateAdjustment = charge.rate;
      if (charge.type === 'deduction') {
        rateAdjustment = -rateAdjustment;
      }
      additionalChargesTotal += round2(rateAdjustment);
      if (isVatApplicable(new Date(charge.week))) {
        weeklyVatTotal += round2(rateAdjustment * 0.2);
      }
    }

    weeklyBaseTotal = round2(weeklyBaseTotal + additionalChargesTotal);
    weeklyVatTotal = round2(weeklyVatTotal);
    const weeklyTotalBeforeInstallments = round2(weeklyBaseTotal + weeklyVatTotal);

    // Restore previous installment deductions
    const allInstallments = await Installment.find({ driverId });
    for (const detail of weeklyInvoice.installmentDetail || []) {
      const inst = allInstallments.find((i) => i._id.toString() === detail._id?.toString());
      if (inst && detail.deductionAmount > 0) {
        inst.installmentPending = round2(inst.installmentPending + detail.deductionAmount);
        await inst.save();
      }
    }

    // Calculate new installment deductions
    const installmentMap = new Map();
    let remainingTotal = weeklyTotalBeforeInstallments;

    for (const inst of allInstallments) {
      const instId = inst._id.toString();
      if (inst.installmentPending <= 0) continue;

      const deduction = Math.min(
        round2(inst.spreadRate),
        round2(inst.installmentPending),
        remainingTotal
      );
      if (deduction <= 0) continue;

      inst.installmentPending = round2(inst.installmentPending - deduction);
      await inst.save();

      installmentMap.set(instId, {
        _id: inst._id,
        installmentRate: inst.installmentRate,
        installmentType: inst.installmentType,
        installmentDocument: inst.installmentDocument,
        installmentPending: inst.installmentPending,
        deductionAmount: round2(deduction),
        signed: inst.signed,
      });

      remainingTotal = round2(remainingTotal - deduction);
    }

    const mergedInstallments = Array.from(installmentMap.values());
    const totalInstallmentDeduction = round2(mergedInstallments.reduce((sum, i) => sum + (i.deductionAmount || 0), 0));
    const finalWeeklyTotal = round2(Math.max(0, weeklyTotalBeforeInstallments - totalInstallmentDeduction));

    // Update WeeklyInvoice
    await WeeklyInvoice.findOneAndUpdate(
      { driverId, serviceWeek },
      {
        $set: {
          vatTotal: weeklyVatTotal,
          total: finalWeeklyTotal,
          installmentDetail: mergedInstallments,
          installments: mergedInstallments.map((inst) => inst._id),
        },
      },
      { new: true }
    );

    sendToClients(req.db, { type: 'rotaUpdated' });
    res.status(200).json(invoiceToUpdate);
  } catch (err) {
    console.error('Error updating invoice:', err);
    res.status(500).json({ message: 'Error updating invoice', error: err.message });
  }
});

router.delete('/', async (req, res) => {
  try {
    const { DayInvoice, WeeklyInvoice, Installment, Driver, AdditionalCharges } = getModels(req);
    const { _id } = req.body;

    const invoice = await DayInvoice.findById(new mongoose.Types.ObjectId(_id));
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const { driverId, serviceWeek, site } = invoice;

    // Delete the invoice
    await DayInvoice.findByIdAndDelete(_id);

    // Fetch remaining invoices and WeeklyInvoice
    const remainingInvoices = await DayInvoice.find({ driverId, serviceWeek }).lean();
    const weeklyInvoice = await WeeklyInvoice.findOne({ driverId, serviceWeek });

    if (!weeklyInvoice && remainingInvoices.length === 0) {
      return res.status(200).json({ message: 'Invoice deleted, no weekly invoice found' });
    }

    // If no remaining invoices, delete WeeklyInvoice
    if (remainingInvoices.length === 0) {
      // Restore installment deductions before deleting WeeklyInvoice
      const allInstallments = await Installment.find({ driverId });
      for (const detail of weeklyInvoice?.installmentDetail || []) {
        const inst = allInstallments.find((i) => i._id.toString() === detail._id?.toString());
        if (inst && detail.deductionAmount > 0) {
          inst.installmentPending = +parseFloat(inst.installmentPending + detail.deductionAmount).toFixed(2);
          await inst.save();
        }
      }

      // Delete WeeklyInvoice
      await WeeklyInvoice.findByIdAndDelete(weeklyInvoice?._id);
      sendToClients(req.db, { type: 'rotaUpdated' });
      return res.status(200).json({ message: 'Invoice and WeeklyInvoice deleted successfully, installment deductions restored' });
    }

    // Calculate weekly total before installments
    const driverData = await Driver.findById(driverId);
    let weeklyBaseTotal = 0;
    let weeklyVatTotal = 0;

    const isVatApplicable = (date) => {
      return (
        (driverData?.vatDetails?.vatNo && date >= new Date(driverData.vatDetails.vatEffectiveDate)) ||
        (driverData?.companyVatDetails?.vatNo && date >= new Date(driverData.companyVatDetails.companyVatEffectiveDate))
      );
    };

    // Sum DayInvoice totals
    for (const inv of remainingInvoices) {
      const invBaseTotal = +parseFloat(inv.total || 0).toFixed(2);
      weeklyBaseTotal += invBaseTotal;
      if (isVatApplicable(new Date(inv.date))) {
        weeklyVatTotal += +parseFloat(invBaseTotal * 0.2).toFixed(2);
      }
    }

    // Add AdditionalCharges contributions
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

    // Restore previous installment deductions
    const allInstallments = await Installment.find({ driverId });
    for (const detail of weeklyInvoice.installmentDetail || []) {
      const inst = allInstallments.find((i) => i._id.toString() === detail._id?.toString());
      if (inst && detail.deductionAmount > 0) {
        inst.installmentPending = +parseFloat(inst.installmentPending + detail.deductionAmount).toFixed(2);
        await inst.save();
      }
    }

    // Calculate new installment deductions
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
    await WeeklyInvoice.findOneAndUpdate(
      { driverId, serviceWeek },
      {
        $pull: { invoices: invoice._id },
        $inc: { count: -1 },
        $set: {
          vatTotal: weeklyVatTotal,
          total: finalWeeklyTotal,
          installmentDetail: mergedInstallments,
          installments: mergedInstallments.map((inst) => inst._id),
        },
      },
      { new: true }
    );

    sendToClients(req.db, { type: 'rotaUpdated' });
    res.status(200).json({ message: 'Invoice deleted and WeeklyInvoice updated successfully' });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    res.status(500).json({ message: 'Error deleting invoice', error: error.message });
  }
});

// Route for fetching invoices by driver, date range, and optional site
router.get('/', async (req, res) => {
  const { driverId, startdate, enddate, site } = req.query;

  let query = {
    driverId: { $in: driverId },
    date: {
      $gte: new Date(startdate),
      $lte: new Date(enddate),
    },
  };

  if (site) query.site = site;

  try {
    const { DayInvoice } = getModels(req);
    const dayInvoices = await DayInvoice.find(query);
    res.status(200).json(dayInvoices);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching invoice', error: error.message });
  }
});

// Route for fetching invoices by site and service week
router.get('/siteandweek', async (req, res) => {
  const { site, serviceWeek, startDate, endDate } = req.query;
  const query = {};

  if (site) query.site = site;
  if (serviceWeek) query.serviceWeek = { $in: serviceWeek };
  if (startDate && endDate) {
    query.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    }
  }

  try {
    const { DayInvoice } = getModels(req);
    const dayInvoices = await DayInvoice.find(query);
    res.status(200).json(dayInvoices);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching day invoices for given site and week', error: error.message });
  }
});

router.get('/siteandweek-multi', async (req, res) => {
  const { sitesArray, serviceWeek, startDate, endDate } = req.query;
  const query = {};

  // Handle multiple sites
  if (Array.isArray(sitesArray) && sitesArray.length > 0) {
    query.site = { $in: sitesArray };
  }

  // Handle week filter
  if (serviceWeek) {
    query.serviceWeek = serviceWeek;
  }

  // Handle date range
  if (startDate && endDate) {
    query.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  try {
    const { DayInvoice } = getModels(req);
    const dayInvoices = await DayInvoice.find(query);
    res.status(200).json(dayInvoices);
  } catch (error) {
    console.error("Error fetching multi-site day invoices:", error);
    res.status(500).json({
      message: 'Error fetching day invoices for given sites and week',
      error: error.message,
    });
  }
});

// Route for fetching invoices for Working Hours
router.post('/workinghours', async (req, res) => {
  const { sitesArray, serviceWeek, startDate, endDate, drivers } = req.body;
  const query = { driverId: { $in: drivers } };

  if (sitesArray) query.site = { $in: sitesArray };
  if (serviceWeek) query.serviceWeek = serviceWeek;
  if (startDate && endDate) {
    query.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    }
  }

  try {
    const { DayInvoice } = getModels(req);
    const dayInvoices = await DayInvoice.find(query);
    res.status(200).json(dayInvoices);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching day invoices for given site and week', error: error.message });
  }
});

//Route for Updating Comments
router.put('/comments', async (req, res) => {
  try {
    const { invoiceID } = req.query;
    const commentObj = req.body;
    const { DayInvoice } = getModels(req);

    if (!invoiceID) {
      return res.status(400).json({ message: "Missing invoiceID" });
    }

    const updatedInvoice = await DayInvoice.findByIdAndUpdate(
      invoiceID,
      { $set: { comments: commentObj } },
      { new: true }
    );
    res.status(200).json(updatedInvoice);
  } catch (error) {
    res.status(500).json({ message: "Error updating Invoice comment", error: error.message });
  }
});


// Route for fetching invoices by driver ID
router.get('/driver', async (req, res) => {
  const { driverId } = req.query;
  try {
    const { DayInvoice } = getModels(req);
    const dayInvoices = await DayInvoice.find({ driverId });
    res.status(200).json(dayInvoices);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching day invoices for given driver ID', error: error.message });
  }
});

// Route for checking if invoices exist for a given rate card
router.get('/dayinvoicechecker', async (req, res) => {
  const { serviceWeek, serviceTitle } = req.query.checkRateCard;

  try {
    const { DayInvoice } = getModels(req);

    const invoicesForMain = await DayInvoice.find({
      serviceWeek,
      mainService: serviceTitle,
    });

    const invoicesForAdditional = await DayInvoice.find({
      serviceWeek,
      'additionalServiceDetails.service': serviceTitle,
    });

    if (invoicesForMain.length > 0 || invoicesForAdditional.length > 0) {
      res.status(200).json({ check: true });
    } else {
      res.status(200).json({ check: false });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error checking invoices', error: error.message });
  }
});

// Route for uploading an invoice document
router.post('/uploadInvoice', upload.any(), async (req, res) => {
  const { user_ID, invoices, serviceWeek, driverName, driverEmail } = req.body;
  const parsedInvoices = invoices.map(invoice => JSON.parse(invoice));
  const invoiceIDs = parsedInvoices.map(invoice => invoice._id);

  try {
    const { User, Notification, DayInvoice } = getModels(req);
    const invoiceDoc = req.files[0]?.location || '';

    const updateResults = await Promise.all(
      invoiceIDs.map(async (invoiceId) => {
        if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
          console.error(`Invalid ObjectId: ${invoiceId}`);
          return null;
        }

        const result = await DayInvoice.updateOne(
          { _id: invoiceId },
          { $set: { invoicedoc: invoiceDoc } }
        );
        return result;
      })
    );

    // Send push notification
    const user = await User.findOne({ user_ID });
    if (user?.expoPushTokens) {
      const expo = new Expo();
      const message = {
        to: user.expoPushTokens,
        title: 'New Invoice Added',
        body: 'A new invoice has been added',
        isRead: false,
      };

      try {
        await expo.sendPushNotificationsAsync([message]);
      } catch (notificationError) {
        console.error('Error sending push notification:', notificationError.message);
      }
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail', // or your chosen email service
      auth: {
        user: process.env.MAILER_EMAIL, // Your email address
        pass: process.env.MAILER_APP_PASSWORD, // Your email password or app password
      },
    });

    // Send OTP email
    const mailOptions = {
      from: process.env.MAILER_EMAIL, // Sender address
      to: user.email, // Receiver address (user's email)
      subject: 'A new payslip has been added',
      html: `<div style="font-family: Arial, sans-serif; background-color: #f4f8ff; padding: 20px; border-radius: 10px; text-align: center;">
      <h2 style="color: #2a73cc;">Your PaySlip is Ready, ${driverName} </h2>
      <p style="font-size: 16px; color: #333;">Check out your earnings for service week <strong>${serviceWeek}</strong> below:</p>
      
      <div style="margin: 20px 0;">
          <a href=${invoiceDoc} target="_blank" rel="noopener" 
             style="background-color: #ff9900; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-size: 18px; font-weight: bold; display: inline-block;">
             📄 Download Invoice
          </a>
      </div>
      
      <p style="color: #555;">Thank you for your hard work! </p>
      <p style="font-weight: bold; color: #2a73cc;">Best wishes,<br>Raina Ltd.</p>
  </div>`,
    };

    await transporter.sendMail(mailOptions);
    // Save notification
    const notification = {
      title: 'New Invoice Added',
      user_ID,
      body: 'A new invoice has been added',
      isRead: false,
    };
    await new Notification({ notification, targetDevice: 'app' }).save();

    res.status(200).json({ url: invoiceDoc });
  } catch (error) {
    res.status(500).json({ message: 'Error saving invoice document', error: error.message });
  }
});

// // Route for updating a day invoice
// router.put('/', async (req, res) => {
//   const { driverId, date, site, serviceWeek, ...updates } = req.body;

//   try {
//     const { DayInvoice, Installment, IdCounter } = getModels(req);

//     const dayInvoice = await DayInvoice.findOne({ driverId, date });

//     const invoiceInSameWeek = await DayInvoice.find({ driverId, serviceWeek, site })
//     const invoiceCounter = await IdCounter.findOneAndUpdate(
//       { idType: "InvoiceNumber" },
//       { $inc: { counterValue: 1 } },
//       { new: true, upsert: true }
//     );
//     let invoiceNumber;
//     let referenceNumber;
//     if (invoiceInSameWeek.length > 0 && invoiceInSameWeek[0]?.referenceNumber) {
//       invoiceNumber = invoiceCounter.counterValue;
//       referenceNumber = invoiceInSameWeek[0]?.referenceNumber
//     }
//     else {
//       const referenceCounter = await IdCounter.findOneAndUpdate(
//         { idType: "ReferenceNumber" },
//         { $inc: { counterValue: 1 } },
//         { new: true, upsert: true }
//       );
//       invoiceNumber = invoiceCounter.counterValue;
//       referenceNumber = referenceCounter.counterValue
//     }

//     // Determine new and removed installments
//     const newInstallment = dayInvoice.installmentDetail.length === 0
//       ? updates.installmentDetail
//       : updates.installmentDetail.filter((update) =>
//         !dayInvoice.installmentDetail.some((existingData) => existingData._id == update._id)
//       );

//     const removedInstallment = updates.installmentDetail.length === 0
//       ? dayInvoice.installmentDetail
//       : dayInvoice.installmentDetail.filter((DIinsta) =>
//         !updates.installmentDetail.some((newInsta) => DIinsta._id == newInsta._id)
//       );

//     // Update installments
//     const installmentAdded = await Installment.find({
//       driverId: dayInvoice.driverId,
//       _id: { $in: newInstallment.map((insta) => insta._id) },
//     });

//     await Promise.all(installmentAdded.map(async (insta) => {
//       const newInstallmentData = newInstallment.find((newinsta) => newinsta._id == insta._id);
//       await Installment.updateOne(
//         { driverId: dayInvoice.driverId, _id: insta._id },
//         { $set: { installmentPending: insta.installmentPending - parseFloat(newInstallmentData.perDayInstallmentRate) } }
//       );
//     }));

//     const installmentRemoved = await Installment.find({
//       driverId: dayInvoice.driverId,
//       _id: { $in: removedInstallment.map((insta) => insta._id) },
//     });

//     await Promise.all(installmentRemoved.map(async (insta) => {
//       const removedInstallmentData = removedInstallment.find((removedinsta) => removedinsta._id == insta._id);
//       await Installment.updateOne(
//         { driverId: dayInvoice.driverId, _id: insta._id },
//         { $set: { installmentPending: insta.installmentPending + parseFloat(removedInstallmentData.perDayInstallmentRate) } }
//       );
//     }));

//     // Update the DayInvoice
//     const updatedDayInvoice = await DayInvoice.findOneAndUpdate(
//       { driverId, date },
//       {
//         $set: {
//           invoiceNumber,
//           referenceNumber,
//           ...updates,
//         },
//       },
//       { new: true }
//     );


//     res.status(200).json(updatedDayInvoice);
//   } catch (error) {
//     res.status(500).json({ message: 'Error updating invoice', error: error.message });
//   }
// });

// Route for updating approval status of an invoice
router.put('/updateApprovalStatus', async (req, res) => {
  const { Id, updates } = req.body;

  try {
    const { DayInvoice } = getModels(req);
    const result = await DayInvoice.updateOne(
      { _id: new mongoose.Types.ObjectId(Id) },
      { $set: updates }
    );
    res.status(200).json(result);
    sendToClients(
      req.db, {
      type: 'approvalStatusUpdated', // Custom event to signal data update
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating invoice', error: error.message });
  }
});



// Route for updating rate card details in invoices
router.put('/ratecardupdate', async (req, res) => {
  const { serviceWeek, serviceTitle, ...updatedRateCard } = req.body;

  try {
    const { DayInvoice } = getModels(req);

    const invoicesForMain = await DayInvoice.find({
      serviceWeek,
      mainService: serviceTitle,
    });

    const invoicesForAdditional = await DayInvoice.find({
      serviceWeek,
      'additionalServiceDetails.service': serviceTitle,
    });

    const updateForMain = invoicesForMain.map((invoice) => ({
      updateOne: {
        filter: { _id: invoice._id },
        update: {
          $set: {
            serviceRateforMain: updatedRateCard.serviceRate,
            byodRate: updatedRateCard.byodRate,
            mileage: updatedRateCard.mileage,
            calculatedMileage: invoice.miles * updatedRateCard.mileage,
            total: invoice.total - (parseFloat(invoice.serviceRateforMain) + parseFloat(updatedRateCard.serviceRate) + parseFloat(updatedRateCard.byodRate) + parseFloat(invoice.miles * updatedRateCard.mileage))
          },
        },
      },
    }));

    const updateForAdditional = invoicesForAdditional.map((invoice) => ({
      updateOne: {
        filter: { _id: invoice._id },
        update: {
          $set: {
            'additionalServiceDetails.serviceRate': updatedRateCard.serviceRate,
            'additionalServiceDetails.byodRate': updatedRateCard.byodRate,
            'additionalServiceDetails.mileage': updatedRateCard.mileage,
            'additionalServiceDetails.calculatedMileage': invoice.additionalServiceDetails.miles * updatedRateCard.mileage,
            total: invoice.total - parseFloat(invoice.serviceRateforAdditional) + parseFloat(updatedRateCard.serviceRate) + parseFloat(updatedRateCard.byodRate) + parseFloat(invoice.additionalServiceDetails.miles * updatedRateCard.mileage),
          },
        },
      },
    }));

    await DayInvoice.bulkWrite(updateForMain);
    await DayInvoice.bulkWrite(updateForAdditional);

    res.status(200).json({ message: 'Rate card updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating rate card', error: error.message });
  }
});

// Route for deleting invoices by rate card
router.delete('/ratecarddelete', async (req, res) => {
  const { serviceWeek, serviceTitle } = req.body.rateCardtoDelete;

  try {
    const { DayInvoice, Installment } = getModels(req);

    const invoicesForMain = await DayInvoice.find({
      serviceWeek,
      mainService: serviceTitle,
    });

    const invoicesForAdditional = await DayInvoice.find({
      serviceWeek,
      'additionalServiceDetails.service': serviceTitle,
    });

    // Update installments for main service invoices
    await Promise.all(
      invoicesForMain.map(async (invoice) => {
        const installment = await Installment.find({
          driverId: invoice.driverId,
          _id: { $in: invoice.installmentDetail.map((insta) => insta._id) },
        });

        await Promise.all(
          installment.map(async (insta) => {
            const dayInvoiceData = invoice.installmentDetail.find(
              (DIinsta) => DIinsta._id == insta._id
            );

            if (dayInvoiceData) {
              await Installment.updateOne(
                { driverId: invoice.driverId, _id: insta._id },
                {
                  $inc: {
                    installmentPending: parseFloat(dayInvoiceData.perDayInstallmentRate),
                  },
                }
              );
            }
          })
        );
      })
    );

    // Delete main service invoices
    const mainInvoiceIds = invoicesForMain.map((invoice) => invoice._id);
    if (mainInvoiceIds.length > 0) {
      await DayInvoice.deleteMany({ _id: { $in: mainInvoiceIds } });
    }

    // Update additional service invoices
    const additionalInvoiceIds = invoicesForAdditional.map((invoice) => invoice._id);
    if (invoicesForAdditional.length > 0) {
      const updatesForAdditional = invoicesForAdditional.map((invoice) => ({
        updateOne: {
          filter: { _id: invoice._id },
          update: {
            $set: {
              total: invoice.total - parseFloat(invoice.serviceRateforAdditional),
              additionalServiceDetails: {},
              serviceRateforAdditional: null,
            },
          },
        },
      }));

      await DayInvoice.bulkWrite(updatesForAdditional);
    }

    sendToClients(
      req.db, {
      type: 'rotaUpdated', // Custom event to signal data update
    });

    res.status(200).json({
      message: 'Invoices successfully deleted',
      deletedMainInvoices: mainInvoiceIds,
      deletedAdditionalInvoices: additionalInvoiceIds,
    });

  } catch (error) {
    res.status(500).json({ message: 'Error deleting invoices', error: error.message });
  }
});

// const installmentUpdatehandler = async (req, driverId, date) => {
//   const { DayInvoice, Installment } = getModels(req);
//   const dayInvoice = await DayInvoice.findOne({ driverId: driverId, date: date })
//   const installment = await Installment.find({ driverId: dayInvoice.driverId, _id: { $in: dayInvoice.installmentDetail.map((insta) => insta._id) } })
//   installment.map(async (insta) => {
//     const dayInvoiceData = dayInvoice.installmentDetail.find((DIinsta) => DIinsta._id == insta._id);
//     const updatedInstallment = await Installment.updateOne(

//       { driverId: dayInvoice.driverId, _id: insta._id },
//       {
//         $set: {
//           installmentPending: insta.installmentPending + parseFloat(dayInvoiceData.perDayInstallmentRate)
//         }
//       }
//     )

//   })
// }

// router.delete('/', async (req, res) => {
//   const { DayInvoice } = getModels(req);
//   const { driverId, date } = req.body
//   try {
//     await installmentUpdatehandler(req, driverId, date)
//     await DayInvoice.deleteOne({ driverId: driverId, date: date })
//     sendToClients(
//       req.db, {
//       type: 'rotaUpdated', // Custom event to signal data update
//     });

//     res.status(200).json({ message: 'Invoice Deleted' })
//   }
//   catch (error) {
//     res.status(500).json({ message: 'Error deleting invoice', error: error.message });
//   }
// })

// Route for deleting an invoice by ID
// router.delete('/deleteInvoiceById/:id', async (req, res) => {
//   const { id } = req.params;

//   try {
//     const { DayInvoice } = getModels(req);
//     await DayInvoice.deleteOne({ _id: new mongoose.Types.ObjectId(id) });
//     res.status(200).json({ message: 'Invoice deleted' });
//     sendToClients(
//       req.db, {
//       type: 'approvalStatusUpdated', // Custom event to signal data update
//     });
//   } catch (error) {
//     res.status(500).json({ message: 'Error deleting invoice', error: error.message });
//   }
// });

// // Route for fetching an invoice by ID
router.get('/dayInvoiceById/:id', async (req, res) => {
  try {
    const { DayInvoice } = getModels(req);
    const dayInvoice = await DayInvoice.findById(req.params.id);

    if (!dayInvoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.status(200).json(dayInvoice);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching invoice', error: error.message });
  }
});




router.put('/additionalserviceapproval', async (req, res) => {
  try {
    const { DayInvoice } = getModels(req);
    const { id, additionalServiceApproval, additionalServiceDetails } = req.body
    const dayInvoice = await DayInvoice.findByIdAndUpdate(id, {
      $set: { additionalServiceApproval, additionalServiceDetails }
    });

    if (!dayInvoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    res.status(200).json(dayInvoice);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching invoice', error: error.message });
  }
})


router.post('/weekly-invoices', async (req, res) => {
  try {
    const { driverIds, startdate, enddate } = req.body;
    const { DayInvoice, WeeklyInvoice } = getModels(req);

    if (!driverIds || !Array.isArray(driverIds) || driverIds.length === 0) {
      return res.status(400).json({ error: 'driverIds array is required' });
    }


    // Fetch invoices from DailyInvoice model
    const invoices = await DayInvoice.find({
      driverId: { $in: driverIds },
      date: {
        $gte: new Date(startdate),
        $lte: new Date(enddate),
      },
    });

    if (!invoices || invoices.length === 0) {
      return res.status(404).json({ error: 'No invoices found' });
    }

    // Group invoices by driverId and serviceWeek
    const groupedInvoices = invoices.reduce((acc, invoice) => {
      // Calculate ISO week from date
      const date = new Date(invoice.date);
      const serviceWeek = invoice.serviceWeek;

      const key = `${invoice.driverId}-${serviceWeek}`;

      if (!acc[key]) {
        acc[key] = {
          driverId: invoice.driverId,
          driverEmail: invoice.driverEmail,
          driverVehicleType: invoice.driverVehicleType,
          driverName: invoice.driverName,
          serviceWeek: serviceWeek,
          site: invoice.site,
          invoices: [],
          count: 0,
          invoiceGeneratedBy: invoice.invoiceGeneratedBy,
          invoiceGeneratedOn: invoice.invoiceGeneratedOn,
          standbyService: invoice.standbyService,
          referenceNumber: invoice.referenceNumber,
          unsigned: false,
        };
      }

      // Check for unsigned deductions or installments
      const unsignedDeductions = invoice.deductionDetail?.filter((dd) => !dd.signed);
      const unsignedInstallment = invoice.installmentDetail?.filter((id) => !id.signed);
      if (unsignedDeductions?.length > 0 || unsignedInstallment?.length > 0) {
        acc[key].unsigned = true;
      }

      acc[key].invoices.push(invoice._id);
      acc[key].count++;
      return acc;
    }, {});

    // Convert grouped invoices to array and save to WeeklyInvoice model
    const weeklyInvoices = Object.values(groupedInvoices);

    // Clear existing records for the same driverId and serviceWeek to avoid duplicates
    for (const invoice of weeklyInvoices) {


      const newWeeklyInvoice = new WeeklyInvoice({
        driverId: invoice.driverId,
        serviceWeek: invoice.serviceWeek,
        driverEmail: invoice.driverEmail,
        driverVehicleType: invoice.driverVehicleType,
        driverName: invoice.driverName,
        site: invoice.site,
        invoices: invoice.invoices,
        count: invoice.count,
        invoiceGeneratedBy: invoice.invoiceGeneratedBy,
        invoiceGeneratedOn: invoice.invoiceGeneratedOn,
        standbyService: invoice.standbyService,
        referenceNumber: invoice.referenceNumber,
        unsigned: invoice.unsigned,
      });

      await newWeeklyInvoice.save();
    }

    res.status(201).json({ message: 'Weekly invoices saved successfully', data: weeklyInvoices });
  } catch (error) {
    console.error('Error saving weekly invoices:', error);
    res.status(500).json({ error: 'Internal server error', errormsg: error });
  }
});

module.exports = router;