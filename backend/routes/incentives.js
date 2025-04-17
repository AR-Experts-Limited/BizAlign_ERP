const express = require('express');
const router = express.Router();
const Incentive = require('../models/Incentive');
const DayInvoice = require("../models/DayInvoice");
const { sendToClients } = require('../utils/sseService');

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

// Add a new Service
router.post('/', async (req, res) => {
  const Incentive = req.db.model('Incentive', require('../models/Incentive').schema);
  const { service, site, month, type, rate, addedBy } = req.body;

  try {
    const newIncentive = new Incentive({ site, service, month, type, rate, addedBy });
    await newIncentive.save();
    sendToClients(
      req.db, {
      type: 'incentivesUpdated', // Custom event to signal data update
    });
    res.status(201).json(newIncentive);
  } catch (error) {
    res.status(500).json({ message: 'Error adding incentive.', error });
  }
});

router.delete('/:id', async (req, res) => {
  const Incentive = req.db.model('Incentive', require('../models/Incentive').schema);
  const DayInvoice = req.db.model('DayInvoice', require("../models/DayInvoice").schema);
  try {
    const { driverId, _id, month, type, rate } = await Incentive.findById(req.params.id);
    const dayInvoices = await DayInvoice.find({
      driverId: driverId,
      'incentiveDetail._id': req.params.id
    })

    const updateDayInvoices = async () => {
      await Promise.all(
        dayInvoices.map(async (dayInvoice) => {
          await DayInvoice.updateOne(
            { _id: dayInvoice._id },
            {
              $set: {
                total: dayInvoice.total - rate,
                incentiveDetail: null,
              },
            }
          );
        })
      );
    };
    updateDayInvoices()
    sendToClients(
      req.db, {
      type: 'incentivesUpdated', // Custom event to signal data update
    });
    await Incentive.findByIdAndDelete(req.params.id)
    res.json({ message: 'Incentive deleted successfully' });
  } catch (error) {
    console.error('Error deleting incentive:', error);
    res.status(500).json({ message: 'Error deleting incentive', error });
  }
});

module.exports = router;