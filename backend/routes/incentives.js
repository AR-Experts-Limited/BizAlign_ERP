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
});

// Get all Services
router.get('/', async (req, res) => {
  const Incentive = req.db.model('Incentive', require('../models/Incentive').schema);
  try {
    const incentives = await Incentive.find();
    res.status(200).json(incentives);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching incentives.' });
  }
});

router.get('/driver', async (req, res) => {
  const Incentive = req.db.model('Incentive', require('../models/Incentive').schema);
  const { service, site, month } = req.query
  try {
    const incentiveDetail = await Incentive.find({ service, site, month })
    res.status(200).json(incentiveDetail)
  }
  catch (error) {
    res.status(500).json({ message: "error fetching driver's incentive details" })
  }
})

// // Add a new Service
// router.post('/', async (req, res) => {
//   const Incentive = req.db.model('Incentive', require('../models/Incentive').schema);
//   const { service, site, month, type, rate, addedBy } = req.body;

//   try {
//     const newIncentive = new Incentive({ site, service, month, type, rate, addedBy });
//     await newIncentive.save();
//     sendToClients(
//       req.db, {
//       type: 'incentivesUpdated', // Custom event to signal data update
//     });
//     res.status(201).json(newIncentive);
//   } catch (error) {
//     res.status(500).json({ message: 'Error adding incentive.', error });
//   }
// });

// router.delete('/:id', async (req, res) => {
//   const Incentive = req.db.model('Incentive', require('../models/Incentive').schema);
//   const DayInvoice = req.db.model('DayInvoice', require("../models/DayInvoice").schema);
//   try {
//     const { driverId, _id, month, type, rate } = await Incentive.findById(req.params.id);
//     const dayInvoices = await DayInvoice.find({
//       driverId: driverId,
//       'incentiveDetail._id': req.params.id
//     })

//     const updateDayInvoices = async () => {
//       await Promise.all(
//         dayInvoices.map(async (dayInvoice) => {
//           await DayInvoice.updateOne(
//             { _id: dayInvoice._id },
//             {
//               $set: {
//                 total: dayInvoice.total - rate,
//                 incentiveDetail: null,
//               },
//             }
//           );
//         })
//       );
//     };
//     updateDayInvoices()
//     sendToClients(
//       req.db, {
//       type: 'incentivesUpdated', // Custom event to signal data update
//     });
//     await Incentive.findByIdAndDelete(req.params.id)
//     res.json({ message: 'Incentive deleted successfully' });
//   } catch (error) {
//     console.error('Error deleting incentive:', error);
//     res.status(500).json({ message: 'Error deleting incentive', error });
//   }
// });


// POST a new incentive
// POST a new incentive
router.post('/', async (req, res) => {
  const { service, site, month, type, rate, addedBy } = req.body;

  try {
    const { Incentive, DayInvoice, WeeklyInvoice, Installment, Driver } = getModels(req);

    if (!moment(month, 'YYYY-MM', true).isValid()) {
      return res.status(400).json({ message: 'Invalid month format. Use YYYY-MM' });
    }

    const newIncentive = new Incentive({
      service,
      site,
      month,
      type,
      rate: +(+rate).toFixed(2),
      addedBy
    });
    await newIncentive.save();

    const startOfMonth = moment(month, 'YYYY-MM').startOf('month').toDate();
    const endOfMonth = moment(month, 'YYYY-MM').endOf('month').toDate();

    const weeklyInvoicesWithInstallments = await WeeklyInvoice.find({
      serviceWeek: {
        $gte: moment(startOfMonth).format('GGGG-[W]WW'),
        $lte: moment(endOfMonth).format('GGGG-[W]WW')
      },
      site,
      installmentDetail: { $exists: true, $ne: [] }
    }).select('driverId serviceWeek installmentDetail');

    const dayInvoices = await DayInvoice.find({
      serviceWeek: {
        $gte: moment(startOfMonth).format('GGGG-[W]WW'),
        $lte: moment(endOfMonth).format('GGGG-[W]WW')
      },
      site,
      $or: [
        { mainService: service },
        { 'additionalServiceDetails.service': service }
      ]
    });

    const affectedWeeklyInvoices = new Set();

    for (const dayInvoice of dayInvoices) {
      let updated = false;

      if (dayInvoice.mainService === service) {
        dayInvoice.incentiveDetailforMain = {
          _id: newIncentive._id,
          service: newIncentive.service,
          type: newIncentive.type,
          rate: newIncentive.rate
        };
        dayInvoice.total = +(+dayInvoice.total + newIncentive.rate).toFixed(2);
        updated = true;
      }

      if (dayInvoice.additionalServiceDetails?.service === service) {
        dayInvoice.incentiveDetailforAdditional = {
          _id: newIncentive._id,
          service: newIncentive.service,
          type: newIncentive.type,
          rate: newIncentive.rate
        };
        dayInvoice.total = +(+dayInvoice.total + newIncentive.rate).toFixed(2);
        updated = true;
      }

      if (updated) {
        await dayInvoice.save();
        affectedWeeklyInvoices.add(`${dayInvoice.driverId}_${dayInvoice.serviceWeek}`);
      }
    }

    for (const weeklyKey of affectedWeeklyInvoices) {
      const [driverId, serviceWeek] = weeklyKey.split('_');
      const weeklyInvoice = await WeeklyInvoice.findOne({ driverId, serviceWeek });
      if (!weeklyInvoice) continue;

      const allDayInvoices = await DayInvoice.find({
        _id: { $in: weeklyInvoice.invoices }
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

      for (const inv of allDayInvoices) {
        const invBaseTotal = +(+inv.total || 0).toFixed(2);
        weeklyBaseTotal += invBaseTotal;
        if (isVatApplicable(new Date(inv.date))) {
          weeklyVatTotal += +(+invBaseTotal * 0.2).toFixed(2);
        }
      }

      weeklyBaseTotal = +weeklyBaseTotal.toFixed(2);
      weeklyVatTotal = +weeklyVatTotal.toFixed(2);
      const weeklyTotalBeforeInstallments = +(weeklyBaseTotal + weeklyVatTotal).toFixed(2);

      // Restore previous installment deductions
      const installmentIds = (weeklyInvoice.installmentDetail || []).map(inst => inst._id).filter(Boolean);
      const allInstallments = await Installment.find({ _id: { $in: installmentIds } });

      for (const detail of weeklyInvoice.installmentDetail || []) {
        const inst = allInstallments.find(i => i._id.toString() === detail._id?.toString());
        if (inst && detail.deductionAmount > 0) {
          inst.installmentPending = +(+inst.installmentPending + detail.deductionAmount).toFixed(2);
          await inst.save();
        }
      }

      // Recalculate installment deductions
      const installmentMap = new Map();
      let remainingTotal = weeklyTotalBeforeInstallments;

      for (const inst of allInstallments) {
        if (inst.installmentPending <= 0) continue;

        const deduction = Math.min(
          +(+inst.spreadRate).toFixed(2),
          +(+inst.installmentPending).toFixed(2),
          remainingTotal
        );
        if (deduction <= 0) continue;

        inst.installmentPending = +(+inst.installmentPending - deduction).toFixed(2);
        await inst.save();

        installmentMap.set(inst._id.toString(), {
          _id: inst._id,
          installmentRate: inst.installmentRate,
          installmentType: inst.installmentType,
          installmentDocument: inst.installmentDocument,
          installmentPending: inst.installmentPending,
          deductionAmount: +deduction.toFixed(2),
          signed: inst.signed,
        });

        remainingTotal = +(+remainingTotal - deduction).toFixed(2);
      }

      const mergedInstallments = Array.from(installmentMap.values());
      const totalInstallmentDeduction = +mergedInstallments.reduce((sum, inst) => sum + (inst.deductionAmount || 0), 0).toFixed(2);

      const finalWeeklyTotal = +Math.max(0, weeklyTotalBeforeInstallments - totalInstallmentDeduction).toFixed(2);
      const unsigned = mergedInstallments.some(inst => !inst.signed);

      weeklyInvoice.total = finalWeeklyTotal;
      weeklyInvoice.vatTotal = weeklyVatTotal;
      weeklyInvoice.installmentDetail = mergedInstallments;
      weeklyInvoice.unsigned = unsigned;
      await weeklyInvoice.save();
    }

    sendToClients(req.db, { type: 'incentivesUpdated' });

    res.status(201).json(newIncentive);
  } catch (error) {
    console.error('Error adding incentive:', error);
    res.status(500).json({ message: 'Error adding incentive', error: error.message });
  }
});


router.delete('/:id', async (req, res) => {
  try {
    const { Incentive, DayInvoice, WeeklyInvoice, Installment, Driver } = getModels(req);
    const incentiveId = req.params.id;

    const incentive = await Incentive.findById(incentiveId);
    if (!incentive) {
      return res.status(404).json({ message: 'Incentive not found' });
    }

    const dayInvoices = await DayInvoice.find({
      $or: [
        { 'incentiveDetailforMain._id': incentiveId },
        { 'incentiveDetailforAdditional._id': incentiveId }
      ]
    });

    if (!dayInvoices.length) {
      await Incentive.findByIdAndDelete(incentiveId);
      return res.status(200).json({ message: 'Incentive deleted, no DayInvoices found' });
    }

    const affectedWeeklyInvoices = new Set();

    for (const dayInvoice of dayInvoices) {
      let updated = false;

      if (dayInvoice.incentiveDetailforMain?._id.toString() === incentiveId) {
        dayInvoice.incentiveDetailforMain = null;
        dayInvoice.total = +Math.max(0, (+dayInvoice.total - incentive.rate).toFixed(2));
        updated = true;
      }

      if (dayInvoice.incentiveDetailforAdditional?._id.toString() === incentiveId) {
        dayInvoice.incentiveDetailforAdditional = null;
        dayInvoice.total = +Math.max(0, (+dayInvoice.total - incentive.rate).toFixed(2));
        updated = true;
      }

      if (updated) {
        await dayInvoice.save();
        affectedWeeklyInvoices.add(`${dayInvoice.driverId}_${dayInvoice.serviceWeek}`);
      }
    }

    for (const weeklyKey of affectedWeeklyInvoices) {
      const [driverId, serviceWeek] = weeklyKey.split('_');
      const weeklyInvoice = await WeeklyInvoice.findOne({ driverId, serviceWeek });
      if (!weeklyInvoice) continue;

      const allDayInvoices = await DayInvoice.find({ _id: { $in: weeklyInvoice.invoices } }).lean();
      const driver = await Driver.findById(driverId);

      let weeklyBaseTotal = 0;
      let weeklyVatTotal = 0;

      const isVatApplicable = (date) => {
        return (
          (driver?.vatDetails?.vatNo && date >= new Date(driver.vatDetails.vatEffectiveDate)) ||
          (driver?.companyVatDetails?.vatNo && date >= new Date(driver.companyVatDetails.companyVatEffectiveDate))
        );
      };

      for (const inv of allDayInvoices) {
        const baseTotal = +(+inv.total || 0).toFixed(2);
        weeklyBaseTotal += baseTotal;

        if (isVatApplicable(new Date(inv.date))) {
          weeklyVatTotal += +(+baseTotal * 0.2).toFixed(2);
        }
      }

      weeklyBaseTotal = +weeklyBaseTotal.toFixed(2);
      weeklyVatTotal = +weeklyVatTotal.toFixed(2);
      const weeklyTotalBeforeInstallments = +(weeklyBaseTotal + weeklyVatTotal).toFixed(2);

      // --- Recalculate Installments ---
      const hadInstallments = Array.isArray(weeklyInvoice.installmentDetail) &&
        weeklyInvoice.installmentDetail.some(inst => inst.deductionAmount > 0);

      let mergedInstallments = [];
      let totalInstallmentDeduction = 0;
      let unsigned = false;

      if (hadInstallments) {
        const installmentIds = (weeklyInvoice.installmentDetail || []).map(inst => inst._id).filter(Boolean);
        const allInstallments = await Installment.find({ _id: { $in: installmentIds } });

        for (const detail of weeklyInvoice.installmentDetail || []) {
          const inst = allInstallments.find(i => i._id.toString() === detail._id?.toString());
          if (inst && detail.deductionAmount > 0) {
            inst.installmentPending = +(+inst.installmentPending + detail.deductionAmount).toFixed(2);
            await inst.save();
          }
        }

        const installmentMap = new Map();
        let remainingTotal = weeklyTotalBeforeInstallments;

        for (const inst of allInstallments) {
          if (inst.installmentPending <= 0) continue;

          const deduction = Math.min(
            +(+inst.spreadRate).toFixed(2),
            +(+inst.installmentPending).toFixed(2),
            remainingTotal
          );
          if (deduction <= 0) continue;

          inst.installmentPending = +(+inst.installmentPending - deduction).toFixed(2);
          await inst.save();

          installmentMap.set(inst._id.toString(), {
            _id: inst._id,
            installmentRate: inst.installmentRate,
            installmentType: inst.installmentType,
            installmentDocument: inst.installmentDocument,
            installmentPending: inst.installmentPending,
            deductionAmount: +deduction.toFixed(2),
            signed: inst.signed,
          });

          remainingTotal = +(+remainingTotal - deduction).toFixed(2);
        }

        mergedInstallments = Array.from(installmentMap.values());
        totalInstallmentDeduction = +mergedInstallments.reduce((sum, inst) => sum + (inst.deductionAmount || 0), 0).toFixed(2);
        unsigned = mergedInstallments.some(inst => !inst.signed);
      }

      const finalWeeklyTotal = +Math.max(0, weeklyTotalBeforeInstallments - totalInstallmentDeduction).toFixed(2);

      weeklyInvoice.total = finalWeeklyTotal;
      weeklyInvoice.vatTotal = weeklyVatTotal;
      weeklyInvoice.installmentDetail = mergedInstallments;
      weeklyInvoice.unsigned = unsigned;
      await weeklyInvoice.save();
    }

    await Incentive.findByIdAndDelete(incentiveId);

    sendToClients(req.db, { type: 'incentivesUpdated' });

    res.status(200).json({ message: 'Incentive deleted and invoices updated' });
  } catch (error) {
    console.error('Error deleting incentive:', error);
    res.status(500).json({ message: 'Error deleting incentive', error: error.message });
  }
});





module.exports = router;