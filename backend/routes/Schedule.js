const express = require('express');
const router = express.Router();
const { Expo } = require('expo-server-sdk');
const { sendToClients } = require('../utils/sseService');

// Helper function to get models from req.db
const getModels = (req) => ({
  Schedule: req.db.model('Schedule', require('../models/Schedule').schema),
  User: req.db.model('User', require('../models/User').schema),
  Notification: req.db.model('Notification', require('../models/notifications').schema),
  DayInvoice: req.db.model('DayInvoice', require('../models/DayInvoice').schema),
});

// Route for adding a new schedule
router.post('/', async (req, res) => {
  try {
    const { Schedule, User, Notification } = getModels(req);
    const { driverId, user_ID, day, service, week, site, associatedRateCard, addedBy, acknowledged } = req.body;

    const newSchedule = new Schedule({
      driverId,
      user_ID,
      day,
      associatedRateCard,
      service,
      week,
      site,
      addedBy,
      acknowledged,
    });
    await newSchedule.save();

    if (!["unavailable", "dayoff"].includes(newSchedule.service)) {
      sendToClients(
        req.db, {
        type: 'scheduleUpdated', // Custom event to signal data update
      });


      const user = await User.findOne({ user_ID });
      if (user?.expoPushTokens) {
        const expo = new Expo();
        const message = {
          to: user.expoPushTokens,
          title: "New Schedule Added",
          body: `A new schedule ${service} has been added at ${site}`,
          data: { scheduleId: newSchedule._id },
          isRead: false,
        };

        try {
          await expo.sendPushNotificationsAsync([message]);
        } catch (notificationError) {
          console.error('Error sending push notification:', notificationError.message);
        }
      }

      const notification = {
        title: "New Schedule Added",
        user_ID,
        body: `A new schedule ${service} has been added at ${site}`,
        data: { scheduleId: newSchedule._id },
        isRead: false,
      };
      await new Notification({ notification, targetDevice: 'app' }).save();

    }

    res.status(201).json(newSchedule);
  } catch (error) {
    console.error('Error saving schedule:', error.message);
    res.status(500).json({ message: 'Error saving schedule', error: error.message });
  }
});

// Route to get schedule data by week and site
router.get('/:week/:site', async (req, res) => {
  const { week, site } = req.params;
  const { drivers } = req.query;

  try {
    const { Schedule } = getModels(req);
    const scheduleData = await Schedule.find({ week, site, driverId: { $in: drivers } });
    res.json(scheduleData);
  } catch (error) {
    console.error('Error fetching schedule data:', error);
    res.status(500).json({ message: 'Error fetching schedule data', error: error.message });
  }
});

// Route to get schedule data by driver and week
router.get('/', async (req, res) => {
  const { week, drivers } = req.query;

  try {
    const { Schedule } = getModels(req);
    const scheduleData = await Schedule.find({ week, driverId: { $in: drivers } });
    res.json(scheduleData);
  } catch (error) {
    console.error('Error fetching schedule data:', error);
    res.status(500).json({ message: 'Error fetching schedule data', error: error.message });
  }
});

router.get('/allschedules', async (req, res) => {
  const { week, drivers } = req.query;

  try {
    const { Schedule } = getModels(req);
    const scheduleData = await Schedule.find();
    res.json(scheduleData);
  } catch (error) {
    console.error('Error fetching schedule data:', error);
    res.status(500).json({ message: 'Error fetching schedule data', error: error.message });
  }
});

// Route to filter schedules by driver and date range
router.get('/filter1', async (req, res) => {
  const { driverId, startDay, endDay } = req.query;

  try {
    const { Schedule } = getModels(req);
    const schedules = await Schedule.find({
      driverId: { $in: driverId },
      day: {
        $gte: new Date(startDay),
        $lte: new Date(endDay),
      },
    }).sort({ day: 1 });
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: 'Error filtering schedule', error: error.message });
  }
});

router.get('/combined', async (req, res) => {
  const { driverId, startDay, endDay } = req.query;

  try {
    const { Schedule } = getModels(req);
    const AppData = req.db.model('AppData', require('../models/appdata').schema);

    const [schedules, appData] = await Promise.all([
      Schedule.find({
        driverId: { $in: driverId },
        day: {
          $gte: new Date(startDay),
          $lte: new Date(endDay),
        },
      }),
      AppData.find({
        driverId: { $in: driverId },
        day: {
          $gte: new Date(startDay),
          $lte: new Date(endDay),
        },
      }),
    ]);

    // Helper to group by driverId and day (ISO string for comparison)
    const groupByDriverDay = (data) => {
      const map = {};
      for (const item of data) {
        const key = `${item.driverId}_${item.day.toISOString().split('T')[0]}`;
        if (!map[key]) {
          map[key] = { driverId: item.driverId, day: item.day, schedule: null, appData: null };
        }
        if (item.__t === 'Schedule') map[key].schedule = item;
        else map[key].appData = item;
      }
      return map;
    };

    // Annotate type for grouping
    schedules.forEach(s => s.__t = 'Schedule');
    appData.forEach(a => a.__t = 'AppData');

    const combinedMap = groupByDriverDay([...schedules, ...appData]);

    const combinedArray = Object.values(combinedMap).sort((a, b) => {
      const dateA = new Date(a.day);
      const dateB = new Date(b.day);
      return dateA - dateB;
    });

    res.status(200).json(combinedArray);
  } catch (error) {
    res.status(500).json({ message: 'Error combining schedule and app data', error: error.message });
  }
});

router.get('/combined-invoice', async (req, res) => {
  const { driverId, startDay, endDay } = req.query;

  try {
    const { Schedule, DayInvoice } = getModels(req);

    const [schedules, invoices] = await Promise.all([
      Schedule.find({
        driverId: { $in: driverId },
        day: {
          $gte: new Date(startDay),
          $lte: new Date(endDay),
        },
      }),
      DayInvoice.find({
        driverId: { $in: driverId },
        date: {
          $gte: new Date(startDay),
          $lte: new Date(endDay),
        },
      }),
    ]);

    // Add a type flag for grouping logic
    schedules.forEach(s => s.__t = 'Schedule');
    invoices.forEach(i => i.__t = 'DayInvoice');

    // Group data by driverId and day
    const groupByDriverDay = (data) => {
      const map = {};
      for (const item of data) {
        const key = `${item.driverId}_${(item.day || item.date).toISOString().split('T')[0]}`;
        if (!map[key]) {
          map[key] = {
            driverId: item.driverId,
            day: item.day || item.date,
            schedule: null,
            invoice: null,
          };
        }
        if (item.__t === 'Schedule') map[key].schedule = item;
        else map[key].invoice = item;
      }
      return map;
    };

    const combinedMap = groupByDriverDay([...schedules, ...invoices]);

    const combinedArray = Object.values(combinedMap).sort((a, b) => {
      return new Date(a.day) - new Date(b.day);
    });

    res.status(200).json(combinedArray);
  } catch (error) {
    res.status(500).json({ message: 'Error combining schedule and invoice data', error: error.message });
  }
});


// Route to delete schedules by driver and date range
router.delete('/', async (req, res) => {
  const { driverId, daysArray } = req.body;

  try {
    const { Schedule } = getModels(req);
    await Schedule.deleteMany({ driverId, day: { $in: daysArray.map(day => new Date(day)) } });
    sendToClients(req.db, {
      type: 'scheduleUpdated', // Custom event to signal data update
    });
    res.json({ message: 'Schedule deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting schedule', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {

  try {
    const { Schedule } = getModels(req);
    await Schedule.findByIdAndDelete(req.params.id)
    sendToClients(req.db, {
      type: 'scheduleUpdated', // Custom event to signal data update
    });
    res.json({ message: 'Schedule deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting schedule', error: error.message });
  }
});

// Route to filter schedules by site and date range
router.get('/filter2', async (req, res) => {
  const { site, startDay, endDay } = req.query;

  try {
    const { Schedule } = getModels(req);
    const schedules = await Schedule.find({
      site,
      day: {
        $gte: new Date(startDay),
        $lte: new Date(endDay),
      },
    }).sort({ day: 1 });
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: 'Error filtering schedule', error: error.message });
  }
});

// Route to check if schedules exist for a given rate card
router.get('/schedulechecker', async (req, res) => {
  const { associatedRateCard } = req.query;
  try {
    const { Schedule } = getModels(req);
    const associatedSchedule = await Schedule.find({ associatedRateCard });
    res.status(200).json({ check: associatedSchedule.length > 0, associatedSchedule });
  } catch (error) {
    res.status(500).json({ check: false, error: error.message });
  }
});

// Route to delete schedules by associated rate card
router.delete('/ratecarddelete', async (req, res) => {
  const { associatedRateCard } = req.body;

  try {
    const { Schedule } = getModels(req);
    const foundSchedules = await Schedule.find({ associatedRateCard });

    await Schedule.deleteMany({ associatedRateCard });
    res.status(200).json('Schedules deleted');
  } catch (error) {
    res.status(500).json('Unable to delete schedule', error.message);
  }
});

module.exports = router;