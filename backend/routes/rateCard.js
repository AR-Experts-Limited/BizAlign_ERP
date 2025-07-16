const express = require('express');
const router = express.Router();
const mongoose = require('mongoose')
const { sendToClients } = require('../utils/sseService');

// Helper function to get models from req.db
const getModels = (req) => ({
  RateCard: req.db.model('RateCard', require('../models/RateCard').schema),
  DayInvoice: req.db.model('DayInvoice', require('../models/DayInvoice').schema),
  WeeklyInvoice: req.db.model('WeeklyInvoice', require('../models/weeklyInvoice').schema),
  Installment: req.db.model('Installment', require('../models/installments').schema),
  Driver: req.db.model('Driver', require('../models/Driver').schema),
  AdditionalCharges: req.db.model('AdditionalCharges', require('../models/additionalCharges').schema),
  Schedule: req.db.model('Schedule', require('../models/Schedule').schema),
});

// Get all rate cards
router.get('/', async (req, res) => {
  try {
    const { RateCard } = getModels(req);
    const rateCards = await RateCard.find();
    res.json(rateCards);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rate cards', error: error.message });
  }
});

const CHUNK_SIZE = 500; // Number of ops per bulkWrite
const MAX_CONCURRENCY = 5; // Max number of concurrent bulkWrites (tune as needed)

// Helper to chunk an array into smaller batches
function chunkArray(array, size) {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size)
  );
}
// Add a new rate card
router.post('/', async (req, res) => {
  const round2 = (num) => +parseFloat(num || 0).toFixed(2);

  try {
    console.time('Total POST /rateCard Execution');

    sendToClients(req.db, {
      type: 'rateCardUpdating',
    });

    const { RateCard, DayInvoice, WeeklyInvoice, Installment, Driver, AdditionalCharges } = getModels(req);
    const {
      serviceTitle,
      serviceRate,
      minimumRate,
      vanRent,
      vanRentHours,
      hourlyRate,
      vehicleType,
      byodRate,
      serviceWeek,
      active,
      mileage,
      addedBy,
      modifiedBy,
      existingWeeks
    } = req.body;

    let { dateAdded } = req.body;
    dateAdded = new Date(dateAdded);

    if (!Array.isArray(serviceWeek) || !Array.isArray(existingWeeks)) {
      return res.status(400).json({ message: 'serviceWeek and existingWeeks must be arrays' });
    }

    const rateCardsAdded = [];
    const updatedRateCards = [];

    // ----------------------------------
    // PHASE 1: Add RateCards & update mileage
    // ----------------------------------
    console.time('Phase 1: Add RateCards & Update Mileage');
    for (const week of serviceWeek) {
      const newRateCard = new RateCard({
        serviceTitle,
        serviceRate: round2(serviceRate),
        vehicleType,
        byodRate: round2(byodRate),
        minimumRate: round2(minimumRate),
        vanRent: round2(vanRent),
        vanRentHours: round2(vanRentHours),
        hourlyRate: round2(hourlyRate),
        active,
        serviceWeek: week,
        mileage: round2(mileage),
        dateAdded,
        addedBy,
        modifiedBy,
      });

      await newRateCard.save();
      rateCardsAdded.push(newRateCard);
    }

    // Update mileage for all RateCards in newly added weeks
    await RateCard.updateMany(
      { serviceWeek: { $in: existingWeeks } },
      { $set: { mileage: round2(mileage) } }
    );

    // Fetch updated rate cards for added weeks
    const addedUpdated = await RateCard.find({ serviceWeek: { $in: serviceWeek } });
    updatedRateCards.push(...addedUpdated);
    console.timeEnd('Phase 1: Add RateCards & Update Mileage');
    // ['2025-W18', '2025-W19', '2025-W20', '2025-W21', '2025-W22', '2025-W23', '2025-W24']
    // ----------------------------------
    // PHASE 2: Update DayInvoices & WeeklyInvoices for existingWeeks
    // ----------------------------------
    console.time('Phase 2: Populate DayInvoices');
    const invoices = await DayInvoice.find({ serviceWeek: { $in: existingWeeks } })
      .populate('rateCardIdforMain')
      .populate('rateCardIdforAdditional').lean();

    const updateOps = [];
    console.timeEnd('Phase 2: Populate DayInvoices');

    console.time('Phase 2: Process DayInvoices');

    for (const invoice of invoices) {
      // ----------- MAIN Service Logic -------------
      if (invoice.rateCardIdforMain) {
        const rc = invoice.rateCardIdforMain;
        const oldIncentiveRate = round2(invoice.incentiveDetailforMain?.reduce((sum, inc) => sum + Number(inc.rate || 0), 0) || 0)
        const oldDeductionTotal = invoice.deductionDetail?.reduce((sum, d) => sum + round2(d.rate), 0) || 0;
        const newIncentiveRate = oldIncentiveRate; // same as current
        const newDeductionTotal = oldDeductionTotal;

        const newMileage = round2(rc.mileage);
        const newCalcMileage = round2(invoice.miles * newMileage);

        const total = round2(
          invoice.total
          - round2(invoice.serviceRateforMain)
          - round2(invoice.byodRate)
          - round2(invoice.calculatedMileage)
          - oldIncentiveRate
          + oldDeductionTotal
          + round2(rc.serviceRate)
          + round2(rc.byodRate)
          + newCalcMileage
          + newIncentiveRate
          - newDeductionTotal
        );

        updateOps.push({
          updateOne: {
            filter: { _id: invoice._id },
            update: {
              $set: {
                serviceRateforMain: round2(rc.serviceRate),
                byodRate: round2(rc.byodRate),
                mileage: newMileage,
                calculatedMileage: newCalcMileage,
                total
              }
            }
          }
        });
      }

      // ----------- ADDITIONAL Service Logic -------------
      if (invoice.rateCardIdforAdditional && invoice.additionalServiceDetails) {
        const rc = invoice.rateCardIdforAdditional;
        const addDetail = invoice.additionalServiceDetails;

        const oldIncentiveRate = round2(invoice.incentiveDetailforAdditional?.reduce((sum, inc) => sum + Number(inc.rate || 0), 0) || 0);
        const oldDeductionTotal = invoice.deductionDetail?.reduce((sum, d) => sum + round2(d.rate), 0) || 0;
        const newIncentiveRate = oldIncentiveRate;
        const newDeductionTotal = oldDeductionTotal;

        const newMileage = round2(rc.mileage);
        const newCalcMileage = round2(addDetail.miles * newMileage);

        const serviceRateForAdditional = round2(rc.serviceRate + rc.byodRate + newCalcMileage + newIncentiveRate);

        const total = round2(
          invoice.total
          - round2(addDetail.serviceRate || 0)
          - round2(addDetail.byodRate || 0)
          - round2(addDetail.calculatedMileage || 0)
          - oldIncentiveRate
          + oldDeductionTotal
          + round2(rc.serviceRate)
          + round2(rc.byodRate)
          + newCalcMileage
          + newIncentiveRate
          - newDeductionTotal
        );

        updateOps.push({
          updateOne: {
            filter: { _id: invoice._id },
            update: {
              $set: {
                'additionalServiceDetails.serviceRate': round2(rc.serviceRate),
                'additionalServiceDetails.byodRate': round2(rc.byodRate),
                'additionalServiceDetails.mileage': newMileage,
                'additionalServiceDetails.calculatedMileage': newCalcMileage,
                serviceRateforAdditional: serviceRateForAdditional,
                total
              }
            }
          }
        });
      }
    }

    console.timeEnd('Phase 2: Process DayInvoices');
    console.time('Phase 2: Write DayInvoices');

    async function parallelBulkWrite(chunks, maxConcurrency = 5) {
      let index = 0;

      async function worker() {
        while (index < chunks.length) {
          const currentIndex = index++;
          const chunk = chunks[currentIndex];
          const label = `bulkWrite chunk ${currentIndex + 1}/${chunks.length}`;
          console.time(label);
          try {
            await DayInvoice.bulkWrite(chunk, { ordered: false });
          } catch (err) {
            console.error(`Error in chunk ${currentIndex + 1}:`, err);
          }
          console.timeEnd(label);
        }
      }

      const workers = Array.from({ length: maxConcurrency }, () => worker());
      await Promise.all(workers);
    }

    if (updateOps.length) {
      const chunks = chunkArray(updateOps, CHUNK_SIZE);
      await parallelBulkWrite(chunks, MAX_CONCURRENCY);
    }

    console.timeEnd('Phase 2: Write DayInvoices');

    console.time('Phase 2: Write WeeklyInvoices');

    const weeklyInvoices = await WeeklyInvoice.find({
      serviceWeek: { $in: existingWeeks }
    }).populate('driverId').populate('installments');

    for (const weeklyInvoice of weeklyInvoices) {
      const driverData = weeklyInvoice.driverId;
      const driverId = driverData._id;
      const week = weeklyInvoice.serviceWeek;

      const allInvoices = await DayInvoice.find({ driverId, serviceWeek: week }).lean();
      let weeklyBaseTotal = 0;
      let weeklyVatTotal = 0;

      const isVatApplicable = (date) => {
        return (
          (driverData?.vatDetails?.vatNo && date >= new Date(driverData.vatDetails.vatEffectiveDate)) ||
          (driverData?.companyVatDetails?.companyVatNo && date >= new Date(driverData.companyVatDetails.companyVatEffectiveDate))
        );
      };

      for (const inv of allInvoices) {
        const invBaseTotal = round2(inv.total);
        weeklyBaseTotal += invBaseTotal;
        if (isVatApplicable(new Date(inv.date))) {
          weeklyVatTotal += round2(invBaseTotal * 0.2);
        }
      }

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

      // Create shallow copies of installments for calculations
      const installmentCopies = (weeklyInvoice.installments || []).map(inst => ({
        ...inst.toObject(),
        installmentPending: round2(inst.installmentPending)
      }));

      // First pass: Apply weeklyInvoice.installmentDetail deductions to copies
      for (const detail of weeklyInvoice.installmentDetail || []) {
        const inst = installmentCopies.find(i => i._id.toString() === detail._id?.toString());
        if (inst && detail.deductionAmount > 0) {
          inst.installmentPending = round2(inst.installmentPending + detail.deductionAmount);
        }
      }

      const installmentMap = new Map();
      let remainingTotal = weeklyTotalBeforeInstallments;

      // Second pass: Calculate new deductions
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

      // Prepare bulk write operations
      const bulkInstallmentOps = mergedInstallments.map(inst => ({
        updateOne: {
          filter: { _id: inst._id },
          update: { $set: { installmentPending: inst.installmentPending } }
        }
      }));

      // Execute bulk write for installments
      if (bulkInstallmentOps.length > 0) {
        await Installment.bulkWrite(bulkInstallmentOps);
      }

      // Update weekly invoice
      await WeeklyInvoice.findOneAndUpdate(
        { _id: weeklyInvoice._id },
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
    }
    console.timeEnd('Phase 2: Write WeeklyInvoices');


    const addedIds = new Set(rateCardsAdded.map(card => card._id.toString()));
    const uniqueUpdated = updatedRateCards.filter(card => !addedIds.has(card._id.toString()));

    sendToClients(req.db, {
      type: 'rateCardUpdated',
    });

    console.timeEnd('Total POST /rateCard Execution');
    res.status(201).json({ added: rateCardsAdded, updated: uniqueUpdated });

  } catch (error) {
    console.error('Error in POST /rateCard:', error.stack);
    res.status(500).json({ message: 'Error adding rate card', error: error.message });
  }
});

router.put('/', async (req, res) => {
  const round2 = (num) => +parseFloat(num || 0).toFixed(2);

  try {
    console.time('Total PUT /rateCard Execution');

    sendToClients(req.db, {
      type: 'rateCardUpdating',
    });

    const { RateCard, DayInvoice, WeeklyInvoice, Installment, Driver, AdditionalCharges } = getModels(req);
    const {
      selectedIds,
      serviceTitle,
      serviceRate,
      minimumRate,
      vanRent,
      vanRentHours,
      hourlyRate,
      vehicleType,
      byodRate,
      serviceWeek,
      active,
      mileage,
      modifiedBy,
    } = req.body;

    // Input validations
    if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
      return res.status(400).json({ message: 'selectedIds must be a non-empty array', type: 'InputValidation' });
    }

    if (!selectedIds.every(id => mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ message: 'Invalid RateCard IDs provided', type: 'InputValidation' });
    }

    if (!Array.isArray(serviceWeek) || serviceWeek.length === 0) {
      return res.status(400).json({ message: 'serviceWeek must be a non-empty array', type: 'InputValidation' });
    }

    // ----------------------------------
    // PHASE 1: Validate RateCards and DayInvoices
    // ----------------------------------
    console.time('Phase 1: Validate RateCards and DayInvoices');

    const negativeInvoices = [];
    const rateCardUpdates = [];
    const dayInvoiceUpdates = [];

    // Fetch RateCards and DayInvoices in parallel
    const dayInvoices = await DayInvoice.find({ serviceWeek: { $in: serviceWeek } })
      .populate('rateCardIdforMain')
      .populate('rateCardIdforAdditional')
      .populate('driverId')
      .lean()

    // Prepare RateCard updates
    for (const week of serviceWeek) {
      for (const id of selectedIds) {
        rateCardUpdates.push({
          _id: id,
          serviceWeek: week,
          update: {
            serviceTitle,
            serviceRate: round2(serviceRate),
            vehicleType,
            minimumRate: round2(minimumRate),
            vanRent: round2(vanRent),
            vanRentHours: round2(vanRentHours),
            hourlyRate: round2(hourlyRate),
            byodRate: round2(byodRate),
            mileage: round2(mileage),
            modifiedBy,
            active
          }
        });
      }
    }
    // Validate DayInvoices and calculate updated totals
    const updatedDayInvoiceTotals = new Map(); // Store updated totals for WeeklyInvoice validation
    for (const invoice of dayInvoices) {
      if (invoice.rateCardIdforMain) {
        const rc = rateCardUpdates.find(update =>
          update._id.toString() === invoice.rateCardIdforMain._id.toString() &&
          update.serviceWeek === invoice.serviceWeek
        )?.update || invoice.rateCardIdforMain;

        const oldIncentiveRate = round2(invoice.incentiveDetailforMain?.reduce((sum, inc) => sum + Number(inc.rate || 0), 0) || 0);
        const oldDeductionTotal = invoice.deductionDetail?.reduce((sum, d) => sum + round2(d.rate), 0) || 0;
        const newIncentiveRate = oldIncentiveRate;
        const newDeductionTotal = oldDeductionTotal;

        const newMileage = round2(rc.mileage);
        const newCalcMileage = round2(invoice.miles * newMileage);

        const total = round2(
          invoice.total
          - round2(invoice.serviceRateforMain)
          - round2(invoice.byodRate)
          - round2(invoice.calculatedMileage)
          - oldIncentiveRate
          + oldDeductionTotal
          + round2(rc.serviceRate)
          + round2(rc.byodRate)
          + newCalcMileage
          + newIncentiveRate
          - newDeductionTotal
        );

        if (total < 0) {
          negativeInvoices.push({
            driverName: invoice.driverName || 'Unknown Driver',
            date: invoice.date,
            type: 'DayInvoice'
          });
        } else {
          const updateOp = {
            filter: { _id: invoice._id },
            update: {
              $set: {
                serviceRateforMain: round2(rc.serviceRate),
                byodRate: round2(rc.byodRate),
                mileage: newMileage,
                calculatedMileage: newCalcMileage,
                total
              }
            }
          };
          dayInvoiceUpdates.push(updateOp);
          updatedDayInvoiceTotals.set(invoice._id.toString(), { total, driverId: invoice.driverId?._id?.toString(), serviceWeek: invoice.serviceWeek });
        }
      }

      if (invoice.rateCardIdforAdditional && invoice.additionalServiceDetails) {
        const rc = rateCardUpdates.find(update =>
          update._id.toString() === invoice.rateCardIdforAdditional._id.toString() &&
          update.serviceWeek === invoice.serviceWeek
        )?.update || invoice.rateCardIdforAdditional;

        const addDetail = invoice.additionalServiceDetails;
        const oldIncentiveRate = round2(invoice.incentiveDetailforAdditional?.reduce((sum, inc) => sum + Number(inc.rate || 0), 0) || 0);
        const oldDeductionTotal = invoice.deductionDetail?.reduce((sum, d) => sum + round2(d.rate), 0) || 0;
        const newIncentiveRate = oldIncentiveRate;
        const newDeductionTotal = oldDeductionTotal;

        const newMileage = round2(rc.mileage);
        const newCalcMileage = round2(addDetail.miles * newMileage);

        const total = round2(
          invoice.total
          - round2(addDetail.serviceRate || 0)
          - round2(addDetail.byodRate || 0)
          - round2(addDetail.calculatedMileage || 0)
          - oldIncentiveRate
          + oldDeductionTotal
          + round2(rc.serviceRate)
          + round2(rc.byodRate)
          + newCalcMileage
          + newIncentiveRate
          - newDeductionTotal
        );

        if (total < 0) {
          negativeInvoices.push({
            driverName: invoice?.driverName || 'Unknown Driver',
            date: invoice.date,
            type: 'DayInvoice'
          });
        } else {
          const updateOp = {
            filter: { _id: invoice._id },
            update: {
              $set: {
                'additionalServiceDetails.serviceRate': round2(rc.serviceRate),
                'additionalServiceDetails.byodRate': round2(rc.byodRate),
                'additionalServiceDetails.mileage': newMileage,
                'additionalServiceDetails.calculatedMileage': newCalcMileage,
                serviceRateforAdditional: round2(rc.serviceRate + rc.byodRate + newCalcMileage + newIncentiveRate),
                total
              }
            }
          };
          dayInvoiceUpdates.push(updateOp);
          updatedDayInvoiceTotals.set(invoice._id.toString(), { total, driverId: invoice.driverId?._id?.toString(), serviceWeek: invoice.serviceWeek });
        }
      }
    }

    // Terminate if any negative DayInvoice totals are found
    if (negativeInvoices.length > 0) {
      console.warn('Update rejected due to negative DayInvoice totals:', negativeInvoices);
      return res.status(400).json({
        message: 'Update would cause negative totals for the following invoices',
        negativeInvoices,
        type: 'DailyInvoice'
      });
    }

    console.timeEnd('Phase 1: Validate RateCards and DayInvoices');

    // ----------------------------------
    // PHASE 2: Validate WeeklyInvoices
    // ----------------------------------
    console.time('Phase 2: Validate WeeklyInvoices');

    // Fetch WeeklyInvoices
    const weeklyInvoices = await WeeklyInvoice.find({
      serviceWeek: { $in: serviceWeek }
    }).populate('driverId').populate('installments').lean();

    // Validate WeeklyInvoices using updated DayInvoice totals
    for (const weeklyInvoice of weeklyInvoices) {
      const driverData = weeklyInvoice.driverId;
      const driverId = driverData?._id?.toString();
      const week = weeklyInvoice.serviceWeek;

      // Use updated DayInvoice totals for this weekly invoice
      let weeklyBaseTotal = 0;
      let weeklyVatTotal = 0;

      const isVatApplicable = (date) => {
        return (
          (driverData?.vatDetails?.vatNo && date >= new Date(driverData.vatDetails.vatEffectiveDate)) ||
          (driverData?.companyVatDetails?.companyVatNo && date >= new Date(driverData.companyVatDetails.companyVatEffectiveDate))
        );
      };

      for (const [invoiceId, { total, driverId: invDriverId, serviceWeek }] of updatedDayInvoiceTotals) {
        if (invDriverId === driverId && serviceWeek === week) {
          const invBaseTotal = round2(total);
          weeklyBaseTotal += invBaseTotal;
          const invoice = dayInvoices.find(inv => inv._id.toString() === invoiceId);
          if (invoice && isVatApplicable(new Date(invoice.date))) {
            weeklyVatTotal += round2(invBaseTotal * 0.2);
          }
        }
      }

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
          type: 'WeeklyInvoice'
        });
      }
    }

    // Terminate if any negative WeeklyInvoice totals are found
    if (negativeInvoices.length > 0) {
      console.warn('Update rejected due to negative WeeklyInvoice totals:', negativeInvoices);
      return res.status(400).json({
        message: 'Update would cause negative totals for the following invoices',
        negativeInvoices,
        type: 'WeeklyInvoice'
      });
    }

    console.timeEnd('Phase 2: Validate WeeklyInvoices');

    // ----------------------------------
    // PHASE 3: Apply RateCard Updates
    // ----------------------------------
    console.time('Phase 3: Update RateCards');
    const updatedRateCards = [];

    // Prepare bulkWrite operations for RateCards
    const rateCardBulkOps = rateCardUpdates.map(update => ({
      updateOne: {
        filter: { _id: update._id, serviceWeek: update.serviceWeek },
        update: { $set: update.update },
        returnDocument: 'after'
      }
    }));

    // Execute bulkWrite for RateCards
    if (rateCardBulkOps.length > 0) {
      const bulkResult = await RateCard.bulkWrite(rateCardBulkOps, { ordered: false });
      const modifiedDocs = bulkResult.getRawResponse()?.modifiedCount || 0;
      console.log(`Bulk updated ${modifiedDocs} RateCards`);

      // Fetch updated RateCards to include in response
      const updatedIds = rateCardUpdates.map(update => update._id);
      const updatedDocs = await RateCard.find({
        _id: { $in: updatedIds },
        serviceWeek: { $in: serviceWeek }
      }).lean();
      updatedRateCards.push(...updatedDocs);
    }

    // Update mileage for all RateCards in serviceWeek
    await RateCard.updateMany(
      { serviceWeek: { $in: serviceWeek } },
      { $set: { mileage: round2(mileage) } }
    );

    const affectedUpdated = await RateCard.find({ serviceWeek: { $in: serviceWeek } });
    updatedRateCards.push(...affectedUpdated);
    console.timeEnd('Phase 3: Update RateCards');

    // ----------------------------------
    // PHASE 4: Apply DayInvoice Updates
    // ----------------------------------
    console.time('Phase 4: Write DayInvoices');

    async function parallelBulkWrite(chunks, maxConcurrency = 5) {
      let index = 0;

      async function worker() {
        while (index < chunks.length) {
          const currentIndex = index++;
          const chunk = chunks[currentIndex];
          const label = `bulkWrite chunk ${currentIndex + 1}/${chunks.length}`;
          console.time(label);
          try {
            await DayInvoice.bulkWrite(chunk, { ordered: false });
          } catch (err) {
            console.error(`Error in chunk ${currentIndex + 1}:`, err);
          }
          console.timeEnd(label);
        }
      }

      const workers = Array.from({ length: maxConcurrency }, () => worker());
      await Promise.all(workers);
    }

    if (dayInvoiceUpdates.length) {
      const chunks = chunkArray(dayInvoiceUpdates.map(op => ({ updateOne: op })), CHUNK_SIZE);
      await parallelBulkWrite(chunks, MAX_CONCURRENCY);
    }

    console.timeEnd('Phase 4: Write DayInvoices');

    // ----------------------------------
    // PHASE 5: Apply WeeklyInvoice Updates
    // ----------------------------------
    console.time('Phase 5: Write WeeklyInvoices');

    const updatedWeeklyInvoices = [];
    const bulkInstallmentOps = [];

    for (const weeklyInvoice of weeklyInvoices) {
      const driverData = weeklyInvoice.driverId;
      const driverId = driverData?._id?.toString();
      const week = weeklyInvoice.serviceWeek;

      // Use updated DayInvoice totals
      let weeklyBaseTotal = 0;
      let weeklyVatTotal = 0;

      const isVatApplicable = (date) => {
        return (
          (driverData?.vatDetails?.vatNo && date >= new Date(driverData.vatDetails.vatEffectiveDate)) ||
          (driverData?.companyVatDetails?.companyVatNo && date >= new Date(driverData.companyVatDetails.companyVatEffectiveDate))
        );
      };

      for (const [invoiceId, { total, driverId: invDriverId, serviceWeek }] of updatedDayInvoiceTotals) {
        if (invDriverId === driverId && serviceWeek === week) {
          const invBaseTotal = round2(total);
          weeklyBaseTotal += invBaseTotal;
          const invoice = dayInvoices.find(inv => inv._id.toString() === invoiceId);
          if (invoice && isVatApplicable(new Date(invoice.date))) {
            weeklyVatTotal += round2(invBaseTotal * 0.2);
          }
        }
      }

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

      const installmentCopies = (weeklyInvoice.installments || []).map(inst => ({
        ...inst.toObject(),
        installmentPending: round2(inst.installmentPending)
      }));

      for (const detail of weeklyInvoice.installmentDetail || []) {
        const inst = installmentCopies.find(i => i._id.toString() === detail._id?.toString());
        if (inst && detail.deductionAmount > 0) {
          inst.installmentPending = round2(inst.installmentPending + detail.deductionAmount);
        }
      }

      const installmentMap = new Map();
      let remainingTotal = weeklyTotalBeforeInstallments;

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

      for (const inst of mergedInstallments) {
        bulkInstallmentOps.push({
          updateOne: {
            filter: { _id: inst._id },
            update: { $set: { installmentPending: inst.installmentPending } }
          }
        });
      }

      updatedWeeklyInvoices.push({
        updateOne: {
          filter: { _id: weeklyInvoice._id },
          update: {
            $set: {
              vatTotal: weeklyVatTotal,
              total: finalWeeklyTotal,
              installmentDetail: mergedInstallments,
              installments: mergedInstallments.map((inst) => inst._id),
            },
          }
        }
      });
    }

    if (bulkInstallmentOps.length > 0) {
      await Installment.bulkWrite(bulkInstallmentOps);
    }

    if (updatedWeeklyInvoices.length > 0) {
      await WeeklyInvoice.bulkWrite(updatedWeeklyInvoices);
    }
    console.timeEnd('Phase 5: Write WeeklyInvoices');

    const uniqueUpdated = Array.from(
      new Map(updatedRateCards.filter(card => card).map(card => [card._id.toString(), card])).values()
    );

    sendToClients(req.db, {
      type: 'rateCardUpdated',
    });

    console.timeEnd('Total PUT /rateCard Execution');
    res.status(200).json({ added: [], updated: uniqueUpdated });

  } catch (error) {
    console.error('Error in PUT /rateCard:', error.stack);
    res.status(500).json({ message: 'Error updating rate card', error: error.message, type: 'ServerError' });
  }
});

// Update active status for selected RateCards
router.put('/active', async (req, res) => {
  try {
    const { RateCard } = getModels(req);
    const { selectedIds, active } = req.body;

    if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
      return res.status(400).json({ message: 'selectedIds must be a non-empty array' });
    }

    if (!selectedIds.every(id => mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ message: 'Invalid RateCard IDs provided' });
    }

    if (typeof active !== 'boolean') {
      return res.status(400).json({ message: 'active must be a boolean' });
    }

    const updatedRateCards = [];

    // Update active status for selected RateCards
    for (const id of selectedIds) {
      const updatedRateCard = await RateCard.findOneAndUpdate(
        { _id: id },
        { $set: { active } },
        { new: true }
      );

      if (updatedRateCard) {
        updatedRateCards.push(updatedRateCard);
      }
    }

    sendToClients(req.db, {
      type: 'rateCardActiveStatusUpdated', // Custom event to signal active status update
    });

    res.status(200).json({ added: [], updated: updatedRateCards });

  } catch (error) {
    res.status(500).json({ message: 'Error updating RateCard active status', error: error.message });
  }
});

// Delete rate cards and associated records
router.delete('/', async (req, res) => {
  const round2 = (num) => +parseFloat(num || 0).toFixed(2);

  try {
    const { RateCard, DayInvoice, Schedule, WeeklyInvoice, Driver, Installment, AdditionalCharges } = getModels(req);
    const { ids, confirm } = req.body; // Expecting array of rate card IDs and confirmation flag

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No rate card IDs provided' });
    }

    if (!ids.every(id => mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ message: 'Invalid RateCard IDs provided' });
    }

    // Find affected RateCards
    const rateCards = await RateCard.find({ _id: { $in: ids } });
    if (!rateCards.length) {
      return res.status(404).json({ message: 'No rate cards found for provided IDs' });
    }

    // Collect unique combinations of serviceWeek, driverVehicleType, and serviceTitle
    const affectedCriteria = [...new Set(rateCards.map(card => ({
      serviceWeek: card.serviceWeek,
      driverVehicleType: card.vehicleType,
      serviceTitle: card.serviceTitle,
    })))];

    // Find associated DayInvoices and Schedules
    const dayInvoices = [];
    const schedules = [];

    for (const { serviceWeek, driverVehicleType, serviceTitle } of affectedCriteria) {
      // Find DayInvoices matching serviceWeek, driverVehicleType, and either mainService or additionalServiceDetails.service
      const invoices = await DayInvoice.find({
        $or: [
          { serviceWeek, driverVehicleType, mainService: serviceTitle },
          {
            serviceWeek,
            driverVehicleType,
            'additionalServiceDetails.service': serviceTitle
          }
        ]
      }).select('driverId serviceWeek driverVehicleType mainService additionalServiceDetails _id total date serviceRateforAdditional incentiveDetailforAdditional');
      dayInvoices.push(...invoices);

      // Find Schedules matching serviceWeek and serviceTitle
      const scheds = await Schedule.find({
        week: serviceWeek,
        service: serviceTitle
      }).select('driverId serviceWeek vehicleType serviceTitle _id');
      schedules.push(...scheds);
    }

    // If confirmation is not provided, return associated records
    if (!confirm && (dayInvoices.length > 0 || schedules.length > 0)) {
      return res.status(200).json({
        confirm,
        message: 'Confirmation required to delete associated records',
        associatedRecords: {
          dayInvoices: dayInvoices.map(inv => ({
            _id: inv._id,
            driverId: inv.driverId,
            serviceWeek: inv.serviceWeek,
            driverVehicleType: inv.driverVehicleType,
            mainService: inv.mainService,
            additionalServiceDetails: inv.additionalServiceDetails || []
          })),
          schedules: schedules.map(sched => ({
            _id: sched._id,
            driverId: sched.driverId,
            serviceWeek: sched.serviceWeek,
            vehicleType: sched.vehicleType,
            serviceTitle: sched.serviceTitle
          })),
        },
      });
    }

    // Separate DayInvoices by whether they need deletion (main service) or update (additional service)
    const invoicesToDelete = [];
    const invoicesToUpdate = [];

    for (const invoice of dayInvoices) {
      if (invoice.mainService === affectedCriteria.find(c => c.serviceWeek === invoice.serviceWeek && c.driverVehicleType === invoice.driverVehicleType)?.serviceTitle) {
        invoicesToDelete.push(invoice);
      } else if (invoice.additionalServiceDetails && invoice.additionalServiceDetails.service === affectedCriteria.find(c => c.serviceWeek === invoice.serviceWeek && c.driverVehicleType === invoice.driverVehicleType)?.serviceTitle) {
        invoicesToUpdate.push(invoice);
      }
    }

    // Update DayInvoices with affected additionalServiceDetails
    const updateOperations = invoicesToUpdate.map(invoice => {
      // Calculate deductions
      let totalDeduction = round2(invoice.serviceRateforAdditional || 0);
      if (invoice.incentiveDetailforAdditional?.length > 0) {
        totalDeduction += round2(invoice.incentiveDetailforAdditional?.reduce((sum, inc) => sum + Number(inc.rate || 0), 0) || 0)
      }

      return {
        updateOne: {
          filter: { _id: invoice._id },
          update: {
            $set: {
              additionalServiceDetails: null,
              serviceRateforAdditional: 0,
              total: round2(invoice.total - totalDeduction)
            }
          }
        }
      };
    });

    // Perform updates for additionalServiceDetails
    if (updateOperations.length > 0) {
      await DayInvoice.bulkWrite(updateOperations);
    }

    // Proceed with deletion of main service invoices
    const dayInvoiceIds = invoicesToDelete.map(inv => inv._id);
    const rateCardResult = await RateCard.deleteMany({ _id: { $in: ids } });
    const dayInvoiceResult = await DayInvoice.deleteMany({ _id: { $in: dayInvoiceIds } });
    const scheduleResult = await Schedule.deleteMany({ _id: { $in: schedules.map(sched => sched._id) } });

    // Find affected drivers and service weeks
    const affectedDriverIds = [...new Set(dayInvoices.map(inv => inv.driverId.toString()))];
    const affectedServiceWeeks = [...new Set(dayInvoices.map(inv => inv.serviceWeek))];

    // Update WeeklyInvoices for affected drivers and weeks
    for (const driverId of affectedDriverIds) {
      for (const serviceWeek of affectedServiceWeeks) {
        const driverData = await Driver.findById(driverId);
        const weeklyInvoice = await WeeklyInvoice.findOne({ driverId, serviceWeek });
        if (!weeklyInvoice) continue;

        // Remove deleted DayInvoice IDs from WeeklyInvoice.invoices
        await WeeklyInvoice.updateOne(
          { driverId, serviceWeek },
          { $pull: { invoices: { $in: dayInvoiceIds } } }
        );

        // Fetch updated WeeklyInvoice to check remaining invoices
        const updatedWeeklyInvoice = await WeeklyInvoice.findOne({ driverId, serviceWeek }).lean();

        // If no invoices remain, restore installments and delete WeeklyInvoice
        if (!updatedWeeklyInvoice.invoices.length) {
          // Restore installment deductions
          const allInstallments = await Installment.find({ driverId });
          for (const detail of updatedWeeklyInvoice.installmentDetail || []) {
            const inst = allInstallments.find((i) => i._id.toString() === detail._id?.toString());
            if (inst && detail.deductionAmount > 0) {
              inst.installmentPending = round2(inst.installmentPending + detail.deductionAmount);
              await inst.save();
            }
          }

          // Delete WeeklyInvoice
          await WeeklyInvoice.deleteOne({ driverId, serviceWeek });
          continue;
        }

        // Fetch remaining DayInvoices
        const allInvoices = await DayInvoice.find({ driverId, serviceWeek }).lean();
        let weeklyBaseTotal = 0;
        let weeklyVatTotal = 0;

        const isVatApplicable = (date) => {
          return (
            (driverData?.vatDetails?.vatNo && date >= new Date(driverData.vatDetails.vatEffectiveDate)) ||
            (driverData?.companyVatDetails?.companyVatNo && date >= new Date(driverData.companyVatDetails.companyVatEffectiveDate))
          );
        };

        // Sum remaining DayInvoice totals
        for (const inv of allInvoices) {
          const invBaseTotal = round2(inv.total);
          weeklyBaseTotal += invBaseTotal;
          if (isVatApplicable(new Date(inv.date))) {
            weeklyVatTotal += round2(invBaseTotal * 0.2);
          }
        }

        // Add AdditionalCharges contributions
        let additionalChargesTotal = 0;
        for (const charge of updatedWeeklyInvoice.additionalChargesDetail || []) {
          let rateAdjustment = round2(charge.rate);
          if (charge.type === 'deduction') {
            rateAdjustment = -rateAdjustment;
          }
          additionalChargesTotal += rateAdjustment;
          if (isVatApplicable(new Date(charge.week))) {
            weeklyVatTotal += round2(rateAdjustment * 0.2);
          }
        }

        weeklyBaseTotal = round2(weeklyBaseTotal + additionalChargesTotal);
        weeklyVatTotal = round2(weeklyVatTotal);
        const weeklyTotalBeforeInstallments = round2(weeklyBaseTotal + weeklyVatTotal);

        // Restore previous installment deductions
        const allInstallments = await Installment.find({ driverId });
        for (const detail of updatedWeeklyInvoice.installmentDetail || []) {
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

        // Update WeeklyInvoice
        await WeeklyInvoice.findOneAndUpdate(
          { driverId, serviceWeek },
          {
            $set: {
              vatTotal: weeklyVatTotal,
              total: finalWeeklyTotal,
              installmentDetail: mergedInstallments,
              invoices: allInvoices.map(inv => inv._id), // Update invoices array with remaining IDs
            },
          },
          { new: true }
        );
      }
    }

    sendToClients(req.db, {
      type: 'rateCardUpdated', // Notify clients of data change
    });

    res.json({
      confirm: true,
      message: `${rateCardResult.deletedCount} rate card(s), ${dayInvoiceResult.deletedCount} day invoice(s), ${updateOperations.length} day invoice(s) updated, and ${scheduleResult.deletedCount} schedule(s) deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting rate cards and associated records:', error.stack);
    res.status(500).json({ message: 'Error deleting rate cards and associated records', error: error.message });
  }
});



module.exports = router;


// // Get rate cards by service week and vehicle type
// router.get('/type_week', async (req, res) => {
//   const { serviceWeek, vehicleType } = req.query;

//   try {
//     const { RateCard } = getModels(req);
//     let query = {};

//     if (serviceWeek) query.serviceWeek = serviceWeek;
//     if (vehicleType) query.vehicleType = vehicleType;

//     const rateCards = await RateCard.find(query);
//     res.json(rateCards);
//   } catch (error) {
//     res.status(500).json({ message: 'Error fetching rate cards', error: error.message });
//   }
// });

// // Get rate cards by service, service week, and vehicle type
// router.get('/filter/weekandservice', async (req, res) => {
//   const { service, serviceWeek, vehicleType } = req.query;

//   try {
//     const { RateCard } = getModels(req);
//     const rateCards = await RateCard.find({ serviceTitle: service, serviceWeek, vehicleType, active: true });
//     res.json(rateCards);
//   } catch (error) {
//     res.status(500).json({ message: 'Error fetching rate cards', error: error.message });
//   }
// });

// // Search rate cards by title
// router.get('/search/title', async (req, res) => {
//   const { serviceTitle } = req.query;

//   try {
//     const { RateCard } = getModels(req);
//     const filter = serviceTitle
//       ? { serviceTitle: { $regex: serviceTitle, $options: 'i' } } // Case-insensitive search
//       : {};

//     const rateCards = await RateCard.find(filter);
//     res.status(200).json(rateCards);
//   } catch (error) {
//     res.status(500).json({ message: 'Error searching rate cards', error: error.message });
//   }
// });