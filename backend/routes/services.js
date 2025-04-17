const express = require('express');
const router = express.Router();

// Get all Services
router.get('/', async (req, res) => {
    const Service = req.db.model('Service',require('../models/Service').schema);
    try {
      const services = await Service.find();
      res.status(200).json(services);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching services' });
    }
});

// Add a new Service
router.post('/', async (req, res) => {
   const Service = req.db.model('Service',require('../models/Service').schema);
    const { title, hours} = req.body;
  
    try {
      const newService = new Service({ title, hours});
      await newService.save();
      res.status(201).json(newService);
    } catch (error) {
      res.status(500).json({ message: 'Error adding service', error });
    }
});

module.exports = router;