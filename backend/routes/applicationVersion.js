
const express = require('express');
const router = express.Router();



router.get('/app-version', async (req, res) => {
    const AppVersion = req.db.model('AppVersion', require('../models/app_version').schema);
     try {
    const { platform } = req.query;
    if (!platform) {
      return res.status(400).json({ error: 'Platform is required' });
    }

    const latest = await AppVersion.findOne({ platform }).sort({ _id: -1 });

    if (!latest) {
      return res.status(404).json({ error: 'No version info found' });
    }

    // Return version and releaseDate (optional)
    res.json({
      version: latest.version,
      releaseDate: latest.releaseDate, // Include if you added this in schema
    });

  } catch (err) {
    console.error('Error fetching version:', err);
    res.status(500).json({ error: 'Failed to get version' });
  }
});

module.exports = router;
