const express = require('express');
const router = express.Router();

router.post('/', async(req, res) => {
    const StandbyDriver = req.db.model('StandbyDriver', require('../models/StandbyDriver').schema);
    try {
        const { driverId, day, site, firstName, lastName } = req.body;
        const newStandbyDriver = new StandbyDriver({ driverId, day, site, firstName, lastName });
        await newStandbyDriver.save();
        res.status(201).json(newStandbyDriver);
      } catch (error) {
        console.error('Error saving standbydriver:', error);
        res.status(500).json({ message: 'Error saving standbydriver', error });
      }
    });

router.get('/', async (req, res) => {
  const StandbyDriver = req.db.model('StandbyDriver', require('../models/StandbyDriver').schema);
        try {
          const standbydrivers = await StandbyDriver.find();
          res.json(standbydrivers);
        } catch (error) {
          res.status(500).json({ message: 'Error fetching standbydrivers', error });
        }
      });

router.get('/:date', async (req, res) => {
  const StandbyDriver = req.db.model('StandbyDriver', require('../models/StandbyDriver').schema);
  try {
    const { date } = req.params;
    const standbydrivers = await StandbyDriver.find({ day: new Date(date) });
    res.json(standbydrivers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching standbydrivers', error });
  }
});

router.delete('/', async (req, res) => {
  const StandbyDriver = req.db.model('StandbyDriver', require('../models/StandbyDriver').schema);
  try{
    const { driverId, day} = req.body
    await StandbyDriver.deleteOne({driverId: driverId, day: new Date(day)})
    res.json({ message: 'Standbyservice deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting Standbyservice', error });
  }
});

module.exports = router;