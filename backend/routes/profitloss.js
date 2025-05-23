const express = require('express');
const router = express.Router();

// Get all Profit Loss entries
router.get('/', async (req, res) => {
    const ProfitLoss = req.db.model('ProfitLoss', require('../models/ProfitLoss').schema);
    try {
      const profitLoss = await ProfitLoss.find();
      res.status(200).json(profitLoss);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching Profit Loss values!' });
    }
});

//ProfitLoss for Week and Site
router.get("/week-site", async (req, res) => {
  const ProfitLoss = req.db.model('ProfitLoss', require('../models/ProfitLoss').schema);
  try {
    const { site, serviceWeek } = req.query;
    const query = {};

    if (site) query.site = site;
    if (serviceWeek) query.week = serviceWeek;

    const results = await ProfitLoss.find(query);
    res.json(results);
  } catch (error){
    res.status(500).json({ message: 'Error fetching Profit Loss values!' });
  }
});


// Add a new Profit Loss entry
router.post('/', async (req, res) => {
    const ProfitLoss = req.db.model('ProfitLoss', require('../models/ProfitLoss').schema);
    const { serviceName, week, site, profitLoss, revenue } = req.body;
    var { addedBy } = req.body;
    addedBy = JSON.parse(addedBy);
    try {
    const exists = await ProfitLoss.findOne({serviceName, week, site});
    if (exists) {
        const updatedRecord = await ProfitLoss.findOneAndUpdate(
          { serviceName, week, site }, // Query to find the document
          { $set: { profitLoss: profitLoss, addedBy: addedBy, revenue: revenue } },
          { new: true } 
      );
        res.status(201).json(updatedRecord);
    }
    else {
      const newProfitLoss = new ProfitLoss({ serviceName, week, site, profitLoss, addedBy });
      await newProfitLoss.save();
      res.status(201).json(newProfitLoss);
      } 
    }
    catch (error) {
      res.status(500).json({ message: 'Error adding Profit Loss entry!', error });
    }
});

module.exports = router;