const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
    const CompanyIncentive = req.db.model('CompanyIncentive', require('../models/CompanyIncentive').schema);
  
    const { site, week, amount } = req.body;
  
    if (!site || !week || amount === undefined) {
      return res.status(400).json({ message: 'Missing site, week, or amount' });
    }
  
    try {
      const updatedIncentive = await CompanyIncentive.findOneAndUpdate(
        { site, week },                   // Match condition
        { site, week, amount },          // Fields to update or insert
        { upsert: true, new: true }      // Create if not found, return updated doc
      );
  
      res.status(200).json({ obj: updatedIncentive, message: 'Company incentive saved/updated' });
    } catch (err) {
      console.error("Error saving/updating incentive:", err);
      res.status(500).json({ message: 'Error saving/updating company incentive' });
    }
});
  

router.get('/', async (req, res) => {
    const CompanyIncentive = req.db.model('CompanyIncentive', require('../models/CompanyIncentive').schema);
    try {
        const incentive = await CompanyIncentive.find({})
        res.status(200).json(incentive)
    }
    catch (err) {
        res.status(500).json({ message: 'error fetching additional charges' })
    }
})

router.get('/by-site-week', async (req, res) => {
    const { site, week } = req.query;
  
    if (!site || !week) {
      return res.status(400).json({ message: "Missing site or week in query" });
    }
  
    try {
      const CompanyIncentive = req.db.model('CompanyIncentive', require('../models/CompanyIncentive').schema);
      const incentives = await CompanyIncentive.find({ site, week });
      res.status(200).json(incentives);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching company incentives', error: err.message });
    }
});  

module.exports = router