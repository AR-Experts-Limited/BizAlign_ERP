// routes/overdueDrivers.js
const express = require('express');
const moment = require('moment-timezone');
const router = express.Router();


router.get('/', async (req, res) => {
  const { site } = req.query;

  if (!site) {
    return res.status(400).json({ error: 'Missing site' });
  }

  try {   
    const Schedule = req.db.model('Schedule', require('../models/Schedule').schema);
    const Driver = req.db.model('Driver', require('../models/Driver').schema);
    const AppData = req.db.model('AppData', require('../models/appdata').schema);
    const Service = req.db.model('Service', require('../models/Service').schema);

    const todayStart = moment.tz('Europe/London').startOf('day').toDate();
    const todayEnd = moment.tz('Europe/London').endOf('day').toDate();

    const schedules = await Schedule.find({
      status: 'in_progress',
      site,
      day: { $gte: todayStart, $lte: todayEnd },
    });

    const results = [];

    for (const schedule of schedules) {
        console.log('📌 Checking Schedule:', schedule._id, schedule.service);
      
        const service = await Service.findOne({ title: schedule.service });
        if (!service || !service.hours) {
          console.log('⛔ No valid service found or missing hours for', schedule.service);
          continue;
        }
      
        const appData = await AppData.findOne({ schedule_ID: schedule._id });
        if (!appData?.startShiftChecklist?.startShiftTimestamp) {
          console.log('⛔ Missing startShiftTimestamp for Schedule:', schedule._id);
          continue;
        }
      
        const start = new Date(appData.startShiftChecklist.startShiftTimestamp);
        const now = new Date();
        const gracePeriodMs = (service.hours + 1) * 60 * 60 * 1000;
        const timeElapsed = now - start;
      
        console.log(`⏱️ Schedule ${schedule._id}: started at ${start.toISOString()}, now is ${now.toISOString()}, elapsed: ${timeElapsed / 60000} min`);
      
        if (timeElapsed > gracePeriodMs) {
          const driver = await Driver.findById(schedule.driverId);
          if (!driver) {
            console.log('❌ Driver not found:', schedule.driverId);
            continue;
          }
      
          console.log(`✅ OVERDUE: ${driver.firstName} ${driver.lastName} by ${Math.floor((timeElapsed - service.hours * 3600000) / 60000)} minutes`);
      
          results.push({
            name: `${driver.firstName} ${driver.lastName}`,
            user_ID: driver.user_ID,
            overdueByMinutes: Math.floor((timeElapsed - service.hours * 60 * 60 * 1000) / 60000),
            site,
            startShiftTimestamp: start,
            profilePicture: driver.profilePicture || [],
          });
        }
      }
      

    res.json(results);
  } catch (err) {
    console.error('❌ Error fetching overdue drivers:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
