const express = require('express');
const router = express.Router();

// Get all Sites
router.get('/', async (req, res) => {
    const Site = req.db.model('Site', require('../models/Site').schema);
    try {
        const sites = await Site.find().sort({ sitekeyword: 1 });
        res.status(200).json(sites);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching sites' });
    }
});

// Add a new Site
router.post('/', async (req, res) => {
    const Service = req.db.model('Site', require('../models/Site').schema);
    const { siteName, siteKeyword } = req.body;

    try {
        const newSite = new Service({ siteName, siteKeyword });
        await newSite.save();
        res.status(201).json(newSite);
    } catch (error) {
        res.status(500).json({ message: 'Error adding site', error });
    }
});

module.exports = router;