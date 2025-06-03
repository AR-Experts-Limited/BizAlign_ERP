const express = require('express');
const router = express.Router();
const { sendToClients } = require('../utils/sseService');

// Helper function to get models from req.db
const getModels = (req) => ({
  RateCard: req.db.model('RateCard', require('../models/RateCard').schema),
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

// Get rate cards by service week and vehicle type
router.get('/type_week', async (req, res) => {
  const { serviceWeek, vehicleType } = req.query;

  try {
    const { RateCard } = getModels(req);
    let query = {};

    if (serviceWeek) query.serviceWeek = serviceWeek;
    if (vehicleType) query.vehicleType = vehicleType;

    const rateCards = await RateCard.find(query);
    res.json(rateCards);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching rate cards', error: error.message });
  }
});

// Get rate cards by service, service week, and vehicle type
router.get('/filter/weekandservice', async (req, res) => {
  const { service, serviceWeek, vehicleType } = req.query;

  try {
    const { RateCard } = getModels(req);
    const rateCards = await RateCard.find({ serviceTitle: service, serviceWeek, vehicleType, active: true });
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


// Search rate cards by title
router.get('/search/title', async (req, res) => {
  const { serviceTitle } = req.query;

  try {
    const { RateCard } = getModels(req);
    const filter = serviceTitle
      ? { serviceTitle: { $regex: serviceTitle, $options: 'i' } } // Case-insensitive search
      : {};

    const rateCards = await RateCard.find(filter);
    res.status(200).json(rateCards);
  } catch (error) {
    res.status(500).json({ message: 'Error searching rate cards', error: error.message });
  }
});

// Update an existing rate card
router.put('/:id', async (req, res) => {
  const { serviceTitle, vehicleType, minimumRate, vanRent, vanRentHours, hourlyRate, serviceRate, byodRate, mileage, serviceWeek, modifiedBy, active } = req.body;

  try {
    const { RateCard } = getModels(req);
    const updatedRateCard = await RateCard.findByIdAndUpdate(
      req.params.id,
      { serviceTitle, serviceRate, vehicleType, minimumRate, vanRent, vanRentHours, hourlyRate, byodRate, mileage, serviceWeek, modifiedBy, active },
      { new: true }
    );


    sendToClients(req.db, {
      type: 'rateCardUpdated', // Custom event to signal data update
    });

    res.json(updatedRateCard);
  } catch (error) {
    res.status(500).json({ message: 'Error updating rate card', error: error.message });
  }
});

// Update mileage for rate cards by service week
router.put('/update/mileage', async (req, res) => {
  const { serviceWeek, mileage } = req.body;

  try {
    const { RateCard } = getModels(req);
    const updatedRateCard = await RateCard.updateMany(
      { serviceWeek: serviceWeek },
      { $set: { mileage: mileage } }
    );

    sendToClients(req.db, {
      type: 'rateCardUpdated', // Custom event to signal data update
    });

    res.json(updatedRateCard);
  } catch (error) {
    res.status(500).json({ message: 'Error updating rate card', error: error.message });
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