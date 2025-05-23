const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
    const AdditionalCharges = req.db.model('AdditionalCharges', require('../models/additionalCharges').schema);
    try {
        const newAddOn = new AdditionalCharges(req.body)
        await newAddOn.save()
        res.status(200).json({ obj: newAddOn, message: 'new additional charge added' })

    }
    catch (err) {
        res.status(500).json({ message: 'error saving additional charge' })
    }
})

router.get('/', async (req, res) => {
  const AdditionalCharges = req.db.model('AdditionalCharges', require('../models/additionalCharges').schema);
  const Driver = req.db.model('Driver', require('../models/Driver').schema);

  try {
    const charges = await AdditionalCharges.find({});
    const driverIds = charges.map(c => c.driverId);

    const activeDrivers = await Driver.find({
      _id: { $in: driverIds },
      disabled: { $ne: true } // Exclude disabled drivers
    });

    const activeDriverIds = new Set(activeDrivers.map(d => d._id.toString()));

    const filtered = charges.filter(c =>
      !c.driverId || activeDriverIds.has(c.driverId.toString())
    );

    res.status(200).json(filtered);
  } catch (err) {
    console.error("Error fetching additional charges:", err);
    res.status(500).json({ message: 'Error fetching additional charges', error: err.message });
  }
});

router.get('/by-sites-week', async (req, res) => {
    const { sitesArray, serviceWeek } = req.query;
  
    if (!sitesArray || !serviceWeek) {
      return res.status(400).json({ message: "Missing sitesArray or serviceWeek in query" });
    }
  
    try {
      const AdditionalCharges = req.db.model('AdditionalCharges', require('../models/additionalCharges').schema);
  
      const charges = await AdditionalCharges.find({
        site: { $in: Array.isArray(sitesArray) ? sitesArray : [sitesArray] },
        week: serviceWeek
      });
  
      res.status(200).json(charges);
    } catch (err) {
      console.error("Error fetching additional charges by sites and week:", err);
      res.status(500).json({ message: 'Error fetching additional charges', error: err.message });
    }
});  

router.delete('/:id', async (req, res) => {
    const AdditionalCharges = req.db.model('AdditionalCharges', require('../models/additionalCharges').schema);
    try {
        await AdditionalCharges.findByIdAndDelete(req.params.id)
        res.status(200).json({ message: 'additional Charge deleted successfully' })
    }
    catch (err) {
        res.status(500).json({ message: 'error deleting additional charges' })
    }
})

module.exports = router