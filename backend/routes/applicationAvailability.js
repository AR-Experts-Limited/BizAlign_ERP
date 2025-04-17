const express = require('express');
const router = express.Router();

// Route to save driver availability
router.post('/', async (req, res) => {
  const DriverAvailability = req.db.model('DriverAvailability',require('../models/DriverAvailability').schema); 
  try {
    const { userId, datesToAdd, datesToRemove, rangesToAdd, rangesToRemove } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required.' });
    }

    // Update individual dates
    if (datesToAdd && datesToAdd.length > 0) {
      await DriverAvailability.updateOne(
        { user_ID: userId },
        { $addToSet: { dates: { $each: datesToAdd } } }, // Add dates without duplicates
        { upsert: true }
      );
    }

    if (datesToRemove && datesToRemove.length > 0) {
      await DriverAvailability.updateOne(
        { user_ID: userId },
        { $pull: { dates: { $in: datesToRemove } } } // Remove specific dates
      );
    }

    // Update date ranges
    if (rangesToAdd && rangesToAdd.length > 0) {
      await DriverAvailability.updateOne(
        { user_ID: userId },
        { $push: { dateRanges: { $each: rangesToAdd } } }, // Add new ranges
        { upsert: true }
      );
    }

    if (rangesToRemove && rangesToRemove.length > 0) {
      for (const range of rangesToRemove) {
        await DriverAvailability.updateOne(
          { user_ID: userId },
          { $pull: { dateRanges: { startDate: range.startDate, endDate: range.endDate } } } // Remove exact range
        );
      }
    }

    res.status(200).json({ message: 'Availability updated successfully.' });
  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(500).json({ message: 'Error updating availability.' });
  }
});


  router.get('/:userId', async (req, res) => {
    const DriverAvailability = req.db.model('DriverAvailability',require('../models/DriverAvailability').schema); 
    try {
      const { userId } = req.params;
  
      const availability = await DriverAvailability.findOne({ user_ID: userId });
      if (!availability) {
        return res.status(200).json({ dates: [], dateRanges: [] });
      }
  
      res.status(200).json({
        dates: availability.dates,
        dateRanges: availability.dateRanges,
      });
    } catch (error) {
      console.error('Error fetching availability:', error);
      res.status(500).json({ message: 'Error fetching availability.' });
    }
  });
  

module.exports = router;
