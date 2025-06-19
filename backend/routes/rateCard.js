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

// Add a new rate card
router.post('/', async (req, res) => {
  try {
    const { RateCard } = getModels(req);
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
      modifiedBy
    } = req.body;

    let { dateAdded } = req.body;
    dateAdded = new Date(dateAdded); // Convert dateAdded to Date object

    if (!Array.isArray(serviceWeek)) {
      return res.status(400).json({ message: 'serviceWeek must be an array' });
    }

    const rateCardsAdded = [];
    const updatedRateCards = [];

    for (const week of serviceWeek) {
      const newRateCard = new RateCard({
        serviceTitle,
        serviceRate,
        vehicleType,
        byodRate,
        minimumRate,
        vanRent,
        vanRentHours,
        hourlyRate,
        active,
        serviceWeek: week,
        mileage,
        dateAdded,
        addedBy,
        modifiedBy,
      });

      await newRateCard.save();
      rateCardsAdded.push(newRateCard);

      // Update and retrieve the updated records for this week
      await RateCard.updateMany(
        { serviceWeek: week },
        { $set: { mileage: mileage } }
      );

      const updated = await RateCard.find({ serviceWeek: week });
      updatedRateCards.push(...updated);
    }

    // Remove duplicates from updatedRateCards that are already in rateCardsAdded
    const addedIds = new Set(rateCardsAdded.map(card => card._id.toString()));
    const filteredUpdated = updatedRateCards.filter(
      card => !addedIds.has(card._id.toString())
    );

    sendToClients(req.db, {
      type: 'rateCardUpdated', // Custom event to signal data update
    });

    res.status(201).json({ added: rateCardsAdded, updated: filteredUpdated });

  } catch (error) {
    res.status(500).json({ message: 'Error adding rate card', error: error.message });
  }
});

// Update rate cards and related invoices
router.put('/', async (req, res) => {
  const round2 = (num) => +parseFloat(num || 0).toFixed(2);

  try {
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
      modifiedBy
    } = req.body;

    console.log('Request payload:', { selectedIds, serviceWeek, serviceTitle, mileage });

    if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
      return res.status(400).json({ message: 'ids must be a non-empty array' });
    }

    if (!selectedIds.every(id => mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ message: 'Invalid RateCard IDs provided' });
    }

    if (!Array.isArray(serviceWeek) || serviceWeek.length === 0) {
      return res.status(400).json({ message: 'serviceWeek must be a non-empty array' });
    }

    const updatedRateCards = [];

    // Update RateCards
    for (const week of serviceWeek) {
      console.log(`Processing week: ${week}`);
      // Update mileage for all RateCards in this week
      await RateCard.updateMany(
        { serviceWeek: week },
        { $set: { mileage: round2(mileage) } }
      );

      // Update specific RateCards by selectedIds
      const existingCards = await RateCard.find({ _id: { $in: selectedIds }, serviceWeek: week });
      console.log(`Found ${existingCards.length} RateCards for week ${week}`);

      for (const id of selectedIds) {
        const updatedRateCard = await RateCard.findOneAndUpdate(
          { _id: id, serviceWeek: week },
          {
            serviceTitle,
            serviceRate: round2(serviceRate),
            vehicleType,
            minimumRate: round2(minimumRate),
            vanRent: round2(vanRent),
            vanRentHours: round2(vanRentHours),
            hourlyRate: round2(hourlyRate),
            byodRate: round2(byodRate),
            mileage: round2(mileage),
            serviceWeek: week,
            modifiedBy,
            active
          },
          { new: true }
        );

        if (updatedRateCard) {
          console.log(`Updated RateCard ID: ${id}`);
        } else {
          console.log(`No RateCard found for ID: ${id}, week: ${week}`);
        }
      }

      // Get all RateCards for this week to find affected services
      const allRateCards = await RateCard.find({ serviceWeek: week });
      const affectedServices = [...new Set(allRateCards.map(card => ({
        serviceTitle: card.serviceTitle,
        vehicleType: card.vehicleType,
        serviceRate: round2(card.serviceRate),
        byodRate: round2(card.byodRate)
      })))];

      console.log(`Affected services for week ${week}:`, affectedServices);

      // Update DayInvoices for all affected services
      for (const { serviceTitle: affectedService, vehicleType: affectedVehicle, serviceRate: affectedRate, byodRate: affectedByod } of affectedServices) {
        // Update DayInvoices for main service
        const invoicesForMain = await DayInvoice.find({
          serviceWeek: week,
          mainService: affectedService,
          driverVehicleType: affectedVehicle
        });
        console.log(`Found ${invoicesForMain.length} main service invoices for ${affectedService}`);

        const updateForMain = invoicesForMain.map((invoice) => {
          const oldIncentiveRate = round2(invoice.incentiveDetailforMain?.rate);
          const oldDeductionTotal = invoice.deductionDetail?.reduce((sum, ded) => sum + round2(ded.rate), 0) || 0;
          const newIncentiveRate = round2(invoice.incentiveDetailforMain?.rate);
          const newDeductionTotal = invoice.deductionDetail?.reduce((sum, ded) => sum + round2(ded.rate), 0) || 0;

          return {
            updateOne: {
              filter: { _id: invoice._id },
              update: {
                $set: {
                  serviceRateforMain: affectedRate,
                  byodRate: affectedByod,
                  mileage: round2(mileage),
                  calculatedMileage: round2(invoice.miles * mileage),
                  total: round2(
                    invoice.total
                    - round2(invoice.serviceRateforMain)
                    - round2(invoice.byodRate)
                    - round2(invoice.calculatedMileage)
                    - oldIncentiveRate
                    + oldDeductionTotal
                    + affectedRate
                    + affectedByod
                    + round2(invoice.miles * mileage)
                    + newIncentiveRate
                    - newDeductionTotal
                  )
                },
              },
            },
          };
        });

        // Update DayInvoices for additional service
        const invoicesForAdditional = await DayInvoice.find({
          serviceWeek: week,
          'additionalServiceDetails.service': affectedService,
          driverVehicleType: affectedVehicle
        });
        console.log(`Found ${invoicesForAdditional.length} additional service invoices for ${affectedService}`);

        const updateForAdditional = invoicesForAdditional.map((invoice) => {
          const oldIncentiveRate = round2(invoice.incentiveDetailforAdditional?.rate);
          const oldDeductionTotal = invoice.deductionDetail?.reduce((sum, ded) => sum + round2(ded.rate), 0) || 0;
          const newIncentiveRate = round2(invoice.incentiveDetailforAdditional?.rate);
          const newDeductionTotal = invoice.deductionDetail?.reduce((sum, ded) => sum + round2(ded.rate), 0) || 0;

          return {
            updateOne: {
              filter: { _id: invoice._id },
              update: {
                $set: {
                  'additionalServiceDetails.serviceRate': affectedRate,
                  'additionalServiceDetails.byodRate': affectedByod,
                  'additionalServiceDetails.mileage': round2(mileage),
                  'additionalServiceDetails.calculatedMileage': round2(invoice.additionalServiceDetails.miles * mileage),
                  serviceRateforAdditional: round2(affectedRate + affectedByod + round2(invoice.additionalServiceDetails.miles * mileage) + newIncentiveRate),
                  total: round2(
                    invoice.total
                    - round2(invoice.additionalServiceDetails.serviceRate)
                    - round2(invoice.additionalServiceDetails.byodRate)
                    - round2(invoice.additionalServiceDetails.calculatedMileage)
                    - oldIncentiveRate
                    + oldDeductionTotal
                    + affectedRate
                    + affectedByod
                    + round2(invoice.additionalServiceDetails.miles * mileage)
                    + newIncentiveRate
                    - newDeductionTotal
                  )
                },
              },
            },
          };
        });

        await DayInvoice.bulkWrite(updateForMain);
        await DayInvoice.bulkWrite(updateForAdditional);
      }

      // Recalculate WeeklyInvoices for affected drivers
      const affectedDriverIds = [
        ...new Set([
          ...(await DayInvoice.find({ serviceWeek: week }).distinct('driverId')).map(id => id.toString())
        ])
      ];
      console.log(`Affected drivers: ${affectedDriverIds.length}`);

      for (const driverId of affectedDriverIds) {
        const driverData = await Driver.findById(driverId);
        const weeklyInvoice = await WeeklyInvoice.findOne({ driverId, serviceWeek: week });
        if (!weeklyInvoice) {
          console.log(`No WeeklyInvoice for driver ${driverId}, week ${week}`);
          continue;
        }

        const allInvoices = await DayInvoice.find({ driverId, serviceWeek: week }).lean();
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
          const invBaseTotal = round2(inv.total);
          weeklyBaseTotal += invBaseTotal;
          if (isVatApplicable(new Date(inv.date))) {
            weeklyVatTotal += round2(invBaseTotal * 0.2);
          }
        }

        // Add AdditionalCharges contributions
        let additionalChargesTotal = 0;
        for (const charge of weeklyInvoice.additionalChargesDetail || []) {
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
          { driverId, serviceWeek: week },
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

      const updated = await RateCard.find({ serviceWeek: week });
      updatedRateCards.push(...updated);
    }


    // Remove duplicates from updatedRateCards
    const uniqueUpdated = Array.from(
      new Map(updatedRateCards.filter(card => card).map(card => [card._id.toString(), card])).values()
    );
    console.log('uniqueUpdated:', uniqueUpdated);

    sendToClients(req.db, {
      type: 'rateCardUpdated', // Custom event to signal data update
    });

    res.status(200).json({ added: [], updated: uniqueUpdated });

  } catch (error) {
    console.error('Error in PUT /rateCard:', error.stack);
    res.status(500).json({ message: 'Error updating rate card', error: error.message });
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

// Delete a rate card
router.delete('/', async (req, res) => {
  try {
    const { RateCard } = getModels(req);
    const { ids } = req.body; // Expecting an array of rate card IDs

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'No rate card IDs provided' });
    }

    const result = await RateCard.deleteMany({ _id: { $in: ids } });

    sendToClients(req.db, {
      type: 'rateCardUpdated', // Notify clients of data change
    });

    res.json({ message: `${result.deletedCount} rate card(s) deleted successfully` });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting rate cards', error: error.message });
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