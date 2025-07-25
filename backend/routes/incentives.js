const express = require('express');
const router = express.Router();
const Incentive = require('../models/Incentive');
const DayInvoice = require("../models/DayInvoice");
const { sendToClients } = require('../utils/sseService');
const moment = require('moment');


const getModels = (req) => ({
  Driver: req.db.model('Driver', require('../models/Driver').schema),
  DayInvoice: req.db.model('DayInvoice', require('../models/DayInvoice').schema),
  WeeklyInvoice: req.db.model('WeeklyInvoice', require('../models/weeklyInvoice').schema),
  Installment: req.db.model('Installment', require('../models/installments').schema),
  Incentive: req.db.model('Incentive', require('../models/Incentive').schema),
  Schedule: req.db.model('Schedule', require('../models/Schedule.js').schema)
});

// Get all Services
router.get('/', async (req, res) => {
  const Incentive = req.db.model('Incentive', require('../models/Incentive').schema);
  try {
    const incentives = await Incentive.find().populate('associatedDeduction');
    res.status(200).json(incentives);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching incentives.' });
  }
});

router.get('/driver', async (req, res) => {
  const Incentive = req.db.model('Incentive', require('../models/Incentive').schema);
  const { service, site, date, driverId } = req.query
  try {
    const query = {
      service,
      startDate: { $lte: new Date(date) },
      endDate: { $gte: new Date(date) },
    };

    if (service === 'Route Support') {
      query.driverId = driverId;
    } else {
      query.site = site;
    }

    const incentiveDetail = await Incentive.find(query);
    res.status(200).json(incentiveDetail);
  }
  catch (error) {
    res.status(500).json({ message: "error fetching driver's incentive details" })
  }
})

// // Add a new Service
router.post('/', async (req, res) => {
  const { service, driverId, receivingDriverId, site, startDate, endDate, type, rate, associatedDeduction, addedBy } = req.body;

  try {
    const { Incentive, DayInvoice, WeeklyInvoice, Installment, Driver, Schedule } = getModels(req);

    // if (!moment(month, 'YYYY-MM', true).isValid()) {
    //   return res.status(400).json({ message: 'Invalid month format. Use YYYY-MM' });
    // }

    let schedule = null
    if (service === 'Route Support') {
      schedule = await Schedule.find({ driverId: receivingDriverId, day: new Date(startDate) })
    }
    // Step 1: Create and save Incentive
    const newIncentive = new Incentive({
      routeSupportService: service === 'Route Support' ? schedule[0]?.service : null,
      driverId: service === 'Route Support' ? driverId : null,
      service,
      site,
      startDate,
      endDate: service === 'Route Support' ? startDate : endDate,
      type,
      rate: +parseFloat(rate).toFixed(2),
      associatedDeduction,
      addedBy,
    });
    await newIncentive.save();

    // Step 2: Find affected DayInvoices
    // const startDate = moment(month, 'YYYY-MM').startOf('month').toDate();
    // const endOfMonth = moment(month, 'YYYY-MM').endOf('month').toDate();

    const query = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(service === 'Route Support' ? startDate : endDate),
      },
      site,
      $or: [
        { mainService: service },
        { 'additionalServiceDetails.service': service },
      ],
    };

    // Only include driverId if service is 'Route Support'
    if (service === 'Route Support') {
      query.driverId = driverId;
    }

    const dayInvoices = await DayInvoice.find(query);


    const affectedWeeklyInvoices = new Set();
    const bulkDayInvoiceOps = [];

    // Step 3: Update DayInvoices
    for (const dayInvoice of dayInvoices) {
      let update = {};
      let updated = false;

      if (dayInvoice.mainService === service) {
        update = {
          ...update,
          $push: {
            incentiveDetailforMain: {
              _id: String(newIncentive._id),
              service: newIncentive.service,
              type: newIncentive.type,
              rate: newIncentive.rate,
              startDate: String(newIncentive.startDate),
              endDate: String(service === 'Route Support' ? newIncentive.startDate : newIncentive.endDate),
            },
          },
          $set: {
            ...(update.$set || {}),
            total: +parseFloat(dayInvoice.total + newIncentive.rate).toFixed(2),
          },
        };
        updated = true;
      }

      if (dayInvoice.additionalServiceDetails?.service === service) {
        update = {
          ...update,
          $push: {
            ...(update.$push || {}),
            incentiveDetailforAdditional: {
              _id: String(newIncentive._id),
              service: newIncentive.service,
              type: newIncentive.type,
              rate: newIncentive.rate,
              startDate: String(newIncentive.startDate),
              endDate: String(service === 'Route Support' ? newIncentive.startDate : newIncentive.endDate),
            },
          },
          $set: {
            ...(update.$set || {}),
            total: +parseFloat(dayInvoice.total + newIncentive.rate).toFixed(2),
          },
        };
        updated = true;
      }

      if (updated) {
        bulkDayInvoiceOps.push({
          updateOne: {
            filter: { _id: dayInvoice._id },
            update,
          },
        });
        affectedWeeklyInvoices.add(`${dayInvoice.driverId}_${dayInvoice.serviceWeek}`);
      }
    }


    if (bulkDayInvoiceOps.length > 0) {
      await DayInvoice.bulkWrite(bulkDayInvoiceOps);
    }

    // Step 4: Update affected WeeklyInvoices
    const bulkWeeklyInvoiceOps = [];
    const bulkInstallmentOps = [];

    for (const weeklyKey of affectedWeeklyInvoices) {
      const [driverId, serviceWeek] = weeklyKey.split('_');
      const weeklyInvoice = await WeeklyInvoice.findOne({ driverId, serviceWeek })
        .populate('installments')
        .lean();
      if (!weeklyInvoice) continue;

      const allDayInvoices = await DayInvoice.find({
        _id: { $in: weeklyInvoice.invoices },
      }).lean();
      const driver = await Driver.findById(driverId).lean();

      let weeklyBaseTotal = 0;
      let weeklyVatTotal = 0;

      const isVatApplicable = (date) => {
        return (
          (driver?.vatDetails?.vatNo && date >= new Date(driver.vatDetails.vatEffectiveDate)) ||
          (driver?.companyVatDetails?.companyVatNo && date >= new Date(driver.companyVatDetails.companyVatEffectiveDate))
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
      }

      weeklyBaseTotal = +parseFloat(weeklyBaseTotal + additionalChargesTotal).toFixed(2);
      weeklyVatTotal = +parseFloat(weeklyVatTotal).toFixed(2);
      const weeklyTotalBeforeInstallments = +parseFloat(weeklyBaseTotal + weeklyVatTotal).toFixed(2);

      // Create temporary copy of installments for recalculation
      const tempInstallments = (weeklyInvoice.installments || []).map((inst) => ({
        ...inst,
        installmentPending: inst.installmentPending,
      }));

      // Restore previous installment deductions temporarily
      const installmentPendingUpdates = new Map();
      for (const detail of weeklyInvoice.installmentDetail || []) {
        const inst = tempInstallments.find((i) => i._id.toString() === detail._id?.toString());
        if (inst && detail.deductionAmount > 0) {
          inst.installmentPending = +parseFloat(inst.installmentPending + detail.deductionAmount).toFixed(2);
          installmentPendingUpdates.set(inst._id.toString(), inst.installmentPending);
        }
      }

      // Recalculate installment deductions
      const installmentMap = new Map();
      let remainingTotal = weeklyTotalBeforeInstallments;

      for (const inst of tempInstallments) {
        const instId = inst._id.toString();
        if (inst.installmentPending <= 0) continue;

        const deduction = Math.min(
          +parseFloat(inst.spreadRate).toFixed(2),
          +parseFloat(inst.installmentPending).toFixed(2),
          remainingTotal
        );
        if (deduction <= 0) continue;

        inst.installmentPending = +parseFloat(inst.installmentPending - deduction).toFixed(2);

        // Prepare bulk update for Installment
        bulkInstallmentOps.push({
          updateOne: {
            filter: { _id: inst._id },
            update: { $set: { installmentPending: inst.installmentPending } },
          },
        });

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

      // Prepare bulk update for WeeklyInvoice
      bulkWeeklyInvoiceOps.push({
        updateOne: {
          filter: { _id: weeklyInvoice._id },
          update: {
            $set: {
              total: finalWeeklyTotal,
              vatTotal: weeklyVatTotal,
              installmentDetail: mergedInstallments,
              installments: mergedInstallments.map((inst) => inst._id),
            },
          },
        },
      });
    }

    // Execute bulk writes for Installments and WeeklyInvoices
    if (bulkInstallmentOps.length > 0) {
      await Installment.bulkWrite(bulkInstallmentOps);
    }
    if (bulkWeeklyInvoiceOps.length > 0) {
      await WeeklyInvoice.bulkWrite(bulkWeeklyInvoiceOps);
    }

    sendToClients(req.db, { type: 'incentivesUpdated' });

    res.status(201).json(newIncentive);
  } catch (error) {
    console.error('Error adding incentive:', error);
    res.status(500).json({ message: 'Error adding incentive', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  const round2 = (num) => +parseFloat(num || 0).toFixed(2);

  try {
    const { Incentive, DayInvoice, WeeklyInvoice, Installment, Driver } = getModels(req);
    const incentiveId = req.params.id;

    // Find the incentive
    const incentive = await Incentive.findById(incentiveId);
    if (!incentive) {
      return res.status(404).json({ message: 'Incentive not found' });
    }

    // Find DayInvoices that reference the incentive
    const dayInvoices = await DayInvoice.find({
      $or: [
        { 'incentiveDetailforMain._id': incentiveId },
        { 'incentiveDetailforAdditional._id': incentiveId },
      ],
    }).populate('driverId').lean(); // Populate driverId to get driverName

    // If no DayInvoices are found, delete the incentive and return
    if (!dayInvoices.length) {
      await Incentive.findByIdAndDelete(incentiveId);
      return res.status(200).json({ message: 'Incentive deleted, no DayInvoices found' });
    }

    // ----------------------------------
    // PHASE 1: Validate DayInvoices
    // ----------------------------------
    const negativeInvoices = [];
    const updatedDayInvoiceTotals = new Map(); // Store updated totals for WeeklyInvoice validation
    const bulkDayInvoiceOps = [];

    for (const invoice of dayInvoices) {
      let total = invoice.total;
      let updated = false;
      const update = {};

      const mainMatch = invoice.incentiveDetailforMain?.find?.((i) => i._id.toString() === incentiveId);
      const additionalMatch = invoice.incentiveDetailforAdditional?.find?.((i) => i._id.toString() === incentiveId);

      if (mainMatch) {
        total -= mainMatch.rate || 0;
        update.$pull = {
          ...update.$pull,
          incentiveDetailforMain: { _id: mainMatch._id },
        };
        updated = true;
      }

      if (additionalMatch) {
        total -= additionalMatch.rate || 0;
        update.$pull = {
          ...update.$pull,
          incentiveDetailforAdditional: { _id: additionalMatch._id },
        };
        updated = true;
      }

      // Check if the new DayInvoice total would be negative
      if (updated && total < 0) {
        negativeInvoices.push({
          driverName: invoice.driverName || 'Unknown Driver',
          date: invoice.date,
          type: 'DailyInvoice',
        });
      } else if (updated) {
        update.$set = { total: round2(total) };
        bulkDayInvoiceOps.push({
          updateOne: {
            filter: { _id: invoice._id },
            update,
          },
        });
        updatedDayInvoiceTotals.set(invoice._id.toString(), {
          total: round2(total),
          driverId: invoice.driverId?._id?.toString(),
          serviceWeek: invoice.serviceWeek,
        });
      }
    }

    // Terminate if any negative DayInvoice totals are found
    if (negativeInvoices.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete incentive: some daily invoices would have negative totals',
        negativeInvoices,
        type: 'DailyInvoice',
      });
    }

    // ----------------------------------
    // PHASE 2: Validate WeeklyInvoices
    // ----------------------------------
    const affectedWeeklyInvoices = new Set();
    const weeklyInvoices = await WeeklyInvoice.find({
      serviceWeek: { $in: [...new Set(dayInvoices.map((inv) => inv.serviceWeek))] },
    })
      .populate('driverId')
      .populate('installments')
      .lean();

    for (const weeklyInvoice of weeklyInvoices) {
      const driverData = weeklyInvoice.driverId;
      const driverId = driverData?._id?.toString();
      const week = weeklyInvoice.serviceWeek;

      let weeklyBaseTotal = 0;
      let weeklyVatTotal = 0;

      const isVatApplicable = (date) => {
        return (
          (driverData?.vatDetails?.vatNo && date >= new Date(driverData.vatDetails.vatEffectiveDate)) ||
          (driverData?.companyVatDetails?.companyVatNo && date >= new Date(driverData.companyVatDetails.companyVatEffectiveDate))
        );
      };

      // Sum updated DayInvoice totals
      for (const [invoiceId, { total, driverId: invDriverId, serviceWeek }] of updatedDayInvoiceTotals) {
        if (invDriverId === driverId && serviceWeek === week) {
          const invBaseTotal = round2(total);
          weeklyBaseTotal += invBaseTotal;
          const invoice = dayInvoices.find((inv) => inv._id.toString() === invoiceId);
          if (invoice && isVatApplicable(new Date(invoice.date))) {
            weeklyVatTotal += round2(invBaseTotal * 0.2);
          }
        }
      }

      // Add additional charges
      let additionalChargesTotal = 0;
      for (const charge of weeklyInvoice.additionalChargesDetail || []) {
        let rateAdjustment = round2(charge.rate);
        if (charge.type === 'deduction') {
          rateAdjustment = -rateAdjustment;
        }
        additionalChargesTotal += rateAdjustment;
      }

      weeklyBaseTotal = round2(weeklyBaseTotal + additionalChargesTotal);
      weeklyVatTotal = round2(weeklyVatTotal);
      const weeklyTotalBeforeInstallments = round2(weeklyBaseTotal + weeklyVatTotal);

      if (weeklyTotalBeforeInstallments < 0) {
        negativeInvoices.push({
          driverName: driverData?.firstName + ' ' + driverData?.lastName || 'Unknown Driver',
          serviceWeek: weeklyInvoice.serviceWeek,
          type: 'WeeklyInvoice',
        });
      } else {
        affectedWeeklyInvoices.add(`${driverId}_${week}`);
      }
    }

    // Terminate if any negative WeeklyInvoice totals are found
    if (negativeInvoices.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete incentive: some weekly invoices would have negative totals',
        negativeInvoices,
        type: 'WeeklyInvoice',
      });
    }

    // ----------------------------------
    // PHASE 3: Apply DayInvoice Updates
    // ----------------------------------
    if (bulkDayInvoiceOps.length > 0) {
      await DayInvoice.bulkWrite(bulkDayInvoiceOps);
    }

    // ----------------------------------
    // PHASE 4: Recalculate WeeklyInvoices and Installments
    // ----------------------------------
    const bulkWeeklyInvoiceOps = [];
    const bulkInstallmentOps = [];

    for (const weeklyKey of affectedWeeklyInvoices) {
      const [driverId, serviceWeek] = weeklyKey.split('_');
      const weeklyInvoice = await WeeklyInvoice.findOne({ driverId, serviceWeek })
        .populate('installments')
        .lean();
      if (!weeklyInvoice) continue;

      const driverData = await Driver.findById(driverId).lean();

      let weeklyBaseTotal = 0;
      let weeklyVatTotal = 0;

      const isVatApplicable = (date) => {
        return (
          (driverData?.vatDetails?.vatNo && date >= new Date(driverData.vatDetails.vatEffectiveDate)) ||
          (driverData?.companyVatDetails?.companyVatNo && date >= new Date(driverData.companyVatDetails.companyVatEffectiveDate))
        );
      };

      // Use updated DayInvoice totals
      for (const [invoiceId, { total, driverId: invDriverId, serviceWeek: invServiceWeek }] of updatedDayInvoiceTotals) {
        if (invDriverId === driverId && invServiceWeek === serviceWeek) {
          const invBaseTotal = round2(total);
          weeklyBaseTotal += invBaseTotal;
          const invoice = dayInvoices.find((inv) => inv._id.toString() === invoiceId);
          if (invoice && isVatApplicable(new Date(invoice.date))) {
            weeklyVatTotal += round2(invBaseTotal * 0.2);
          }
        }
      }

      // Add additional charges
      let additionalChargesTotal = 0;
      for (const charge of weeklyInvoice.additionalChargesDetail || []) {
        let rateAdjustment = round2(charge.rate);
        if (charge.type === 'deduction') {
          rateAdjustment = -rateAdjustment;
        }
        additionalChargesTotal += rateAdjustment;
      }

      weeklyBaseTotal = round2(weeklyBaseTotal + additionalChargesTotal);
      weeklyVatTotal = round2(weeklyVatTotal);
      const weeklyTotalBeforeInstallments = round2(weeklyBaseTotal + weeklyVatTotal);

      const installmentCopies = (weeklyInvoice.installments || []).map((inst) => ({
        ...inst,
        installmentPending: round2(inst.installmentPending),
      }));

      // Restore previous installment deductions
      for (const detail of weeklyInvoice.installmentDetail || []) {
        const inst = installmentCopies.find((i) => i._id.toString() === detail._id?.toString());
        if (inst && detail.deductionAmount > 0) {
          inst.installmentPending = round2(inst.installmentPending + detail.deductionAmount);
        }
      }

      const installmentMap = new Map();
      let remainingTotal = weeklyTotalBeforeInstallments;

      // Calculate new deductions
      for (const inst of installmentCopies) {
        const instId = inst._id.toString();
        if (inst.installmentPending <= 0) continue;

        const deduction = Math.min(
          round2(inst.spreadRate),
          round2(inst.installmentPending),
          remainingTotal
        );
        if (deduction <= 0) continue;

        inst.installmentPending = round2(inst.installmentPending - deduction);

        bulkInstallmentOps.push({
          updateOne: {
            filter: { _id: inst._id },
            update: { $set: { installmentPending: inst.installmentPending } },
          },
        });

        installmentMap.set(instId, {
          _id: inst._id,
          installmentRate: round2(inst.installmentRate),
          installmentType: inst.installmentType,
          installmentDocument: inst.installmentDocument,
          installmentPending: round2(inst.installmentPending),
          deductionAmount: round2(deduction),
          signed: inst.signed,
        });

        remainingTotal = round2(remainingTotal - deduction);
      }

      const mergedInstallments = Array.from(installmentMap.values());
      const totalInstallmentDeduction = round2(
        mergedInstallments.reduce((sum, inst) => sum + (inst.deductionAmount || 0), 0)
      );

      const finalWeeklyTotal = round2(Math.max(0, weeklyTotalBeforeInstallments - totalInstallmentDeduction));

      bulkWeeklyInvoiceOps.push({
        updateOne: {
          filter: { _id: weeklyInvoice._id },
          update: {
            $set: {
              total: finalWeeklyTotal,
              vatTotal: weeklyVatTotal,
              installmentDetail: mergedInstallments,
              installments: mergedInstallments.map((inst) => inst._id),
            },
          },
        },
      });
    }

    // Perform bulk updates for Installments and WeeklyInvoices
    if (bulkInstallmentOps.length > 0) {
      await Installment.bulkWrite(bulkInstallmentOps);
    }
    if (bulkWeeklyInvoiceOps.length > 0) {
      await WeeklyInvoice.bulkWrite(bulkWeeklyInvoiceOps);
    }

    // Delete the incentive
    await Incentive.findByIdAndDelete(incentiveId);
    sendToClients(req.db, { type: 'incentivesUpdated' });

    res.status(200).json({ message: 'Incentive deleted and invoices updated' });
  } catch (error) {
    console.error('Error deleting incentive:', error);
    res.status(500).json({ message: 'Error deleting incentive', error: error.message });
  }
});






module.exports = router;