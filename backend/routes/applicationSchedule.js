const express = require('express');
const router = express.Router();
const moment = require('moment-timezone');


// Add a new schedule

router.post('/', async (req, res) => {
  const Schedule = req.db.model('Schedule', require('../models/Schedule').schema);
  try {
    const { driverId, day, service, week, site, user_ID } = req.body;

    if (!driverId || !day || !service || !week || !user_ID) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    const newSchedule = new Schedule({ driverId, day, service, week, site, user_ID });
    await newSchedule.save();
    res.status(201).json({ message: 'Schedule added successfully.', schedule: newSchedule });
  } catch (error) {
    console.error('Error saving schedule:', error);
    res.status(500).json({ message: 'Error saving schedule.', error });
  }
});

// Get Schedules by user_ID - For App - place above router.get('/:week/:site', async (req, res)
router.get('/user/:user_ID', async (req, res) => {
  const Schedule = req.db.model('Schedule', require('../models/Schedule').schema);
  try {
    const { user_ID: pathUserId } = req.params;

    const query = { user_ID: String(pathUserId) };
    const shifts = await Schedule.find(query).sort({ day: 1 });

    if (!shifts.length) {
      return res.status(404).json({ message: 'No schedules found.' });
    }

    // ✅ Convert day to UK timezone in response
    const convertedShifts = shifts.map(shift => ({
      ...shift.toObject(),
      day: moment(shift.day).tz('Europe/London').format('YYYY-MM-DD'),
    }));

    res.status(200).json(convertedShifts);
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).json({ message: 'Error fetching shifts.', error });
  }
});


// Get schedules by week and site
router.get('/:week/:site', async (req, res) => {
  const Schedule = req.db.model('Schedule', require('../models/Schedule').schema);
  try {
    const { week, site } = req.params;
    const { drivers, page = 1, limit = 10 } = req.query;

    const query = { week, site };
    if (drivers) {
      query.driverId = { $in: drivers.split(',') };
    }

    const schedules = await Schedule.find(query)
      .sort({ day: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Schedule.countDocuments(query);

    res.json({ schedules, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Error fetching schedules by week and site:', error);
    res.status(500).json({ message: 'Error fetching schedules.', error });
  }
});





// Get schedules for a specific driver and week
router.get('/', async (req, res) => {
  const Schedule = req.db.model('Schedule', require('../models/Schedule').schema);
  try {
    const { week, drivers, page = 1, limit = 10 } = req.query;

    const query = { week };
    if (drivers) {
      query.driverId = { $in: drivers.split(',') };
    }

    const schedules = await Schedule.find(query)
      .sort({ day: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Schedule.countDocuments(query);

    res.json({ schedules, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Error fetching schedules by week and drivers:', error);
    res.status(500).json({ message: 'Error fetching schedules.', error });
  }
});


// Get schedules filtered by driverId and date range
router.get('/filter1', async (req, res) => {
  const Schedule = req.db.model('Schedule', require('../models/Schedule').schema);
  try {
    const { driverId, startDay, endDay } = req.query;

    if (!driverId || !startDay || !endDay) {
      return res.status(400).json({ message: 'Missing required fields: driverId, startDay, endDay.' });
    }

    const schedules = await Schedule.find({
      driverId: { $in: driverId.split(',') },
      day: { $gte: new Date(startDay), $lte: new Date(endDay) },
    }).sort({ day: 1 });

    res.json(schedules);
  } catch (error) {
    console.error('Error filtering schedules by driverId and date range:', error);
    res.status(500).json({ message: 'Error filtering schedules.', error });
  }
});

// Get schedules filtered by site and date range
router.get('/filter2', async (req, res) => {
  const Schedule = req.db.model('Schedule', require('../models/Schedule').schema);
  try {
    const { site, startDay, endDay } = req.query;

    if (!site || !startDay || !endDay) {
      return res.status(400).json({ message: 'Missing required fields: site, startDay, endDay.' });
    }

    const schedules = await Schedule.find({
      site,
      day: { $gte: new Date(startDay), $lte: new Date(endDay) },
    }).sort({ day: 1 });

    res.json(schedules);
  } catch (error) {
    console.error('Error filtering schedules by site and date range:', error);
    res.status(500).json({ message: 'Error filtering schedules.', error });
  }
});

// Delete multiple schedules for a specific driverId and days
router.delete('/', async (req, res) => {
  const Schedule = req.db.model('Schedule', require('../models/Schedule').schema);
  try {
    const { driverId, daysArray } = req.body;

    if (!driverId || !daysArray || !daysArray.length) {
      return res.status(400).json({ message: 'Missing required fields: driverId, daysArray.' });
    }

    const result = await Schedule.deleteMany({
      driverId,
      day: { $in: daysArray.map((day) => new Date(day)) },
    });

    res.json({ message: `${result.deletedCount} schedule(s) deleted.` });
  } catch (error) {
    console.error('Error deleting schedules:', error);
    res.status(500).json({ message: 'Error deleting schedules.', error });
  }
});

router.get('/shift-status/:user_ID/:schedule_ID', async (req, res) => {
  const Schedule = req.db.model('Schedule', require('../models/Schedule').schema);
  try {
    const { user_ID, schedule_ID } = req.params;

    // Find the shift with matching user_ID and schedule_ID
    const shift = await Schedule.findOne({ user_ID, _id: schedule_ID });

    if (!shift) {
      return res.status(200).json({ status: "not_started" });
    }

    res.status(200).json({ status: shift.status });
  } catch (error) {
    console.error("Error fetching shift status:", error);
    res.status(500).json({ message: "Error fetching shift status.", error });
  }
});


module.exports = router;
