const express = require('express');
const router = express.Router();
const { getDatabaseConnection } = require('../config/database');
const { suspendInactiveDrivers, remindPendingShiftOSMs  } = require('../utils/scheduledTasks');
const moment = require('moment-timezone');

router.post('/suspend-drivers', async (req, res) => {
    try {
      const { cID } = req.query;
      if (!cID) return res.status(400).json({ error: 'Missing cID query param' });
  
      const conn = await getDatabaseConnection(cID);
      const suspendedDrivers = await suspendInactiveDrivers(conn);
        
      res.status(200).json({
        message: `Suspension task completed for ${cID}`,
        count: suspendedDrivers.length,
        suspendedDrivers
      });

      console.log(`Suspension task completed for ${cID}`, suspendedDrivers);
    } catch (err) {
      console.error('Manual suspension failed:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/test-reminder', async (req, res) => {
    const { cID } = req.query;
  
    try {
      const conn = await getDatabaseConnection(cID);
      const result = await remindPendingShiftOSMs(conn);
  
      res.json({
        message: "Reminder check complete",
        count: result?.length || 0,
        sample: result?.slice(0, 3) || [] // send a few sample shifts
      });
    } catch (err) {
      console.error("❌ Error in /test-reminder:", err);
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/test-inprogress', async (req, res) => {
    const Schedule = req.db.model('Schedule', require('../models/Schedule').schema);
  
    const result = await Schedule.find({ status: 'in_progress' }).limit(5);
    res.json({ count: result.length, sample: result });
  });
  
  router.get('/test-date-range', async (req, res) => {
    const Schedule = req.db.model('Schedule', require('../models/Schedule').schema);
  
    const todayStart = moment().tz('Europe/London').startOf('day').toDate();
    const todayEnd = moment().tz('Europe/London').endOf('day').toDate();
  
    const result = await Schedule.find({
      status: 'in_progress',
      day: { $gte: todayStart, $lte: todayEnd }
    }).limit(5);
  
    res.json({ count: result.length, sample: result });
  });
  
  router.get('/test-missing-endshift', async (req, res) => {
    const AppData = req.db.model('AppData', require('../models/appdata').schema);
  
    const result = await AppData.find({
      "endShiftChecklist.endShiftTimestamp": { $exists: false }
    }).limit(5);
  
    res.json({ count: result.length, sample: result });
  });
  
  router.get('/force-reminder', async (req, res) => {
    
  
    try {
      const result = await remindPendingShiftOSMs();
      res.json({
        message: "Manual cron trigger successful",
        count: result.length,
        sample: result.slice(0, 3)
      });
    } catch (error) {
      console.error("❌ Error in manual reminder trigger:", error);
      res.status(500).json({ error: error.message });
    }
  });
  
  

module.exports = router;
