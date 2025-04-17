const express = require('express');
const multer = require('multer');


const { uploadToS3 } = require('../utils/applications3Helper');
const router = express.Router();
const { sendToClients } = require('../utils/sseService');

// Dynamic import for node-fetch
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Multer setup for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * GET Shift Checklists
 * Fetch shift data from AppData table
 */
router.get('/:driverId/:schedule_ID/:day', async (req, res) => {

  const AppData = req.db.model('AppData', require('../models/appdata').schema);
  try {
    const { driverId, schedule_ID, day } = req.params;

    // Convert 'day' to a Date object for MongoDB query
    const queryDate = new Date(day);

    // Find the AppData for the specified parameters
    const appData = await AppData.findOne({ driverId, schedule_ID, day: queryDate });

    if (!appData) {
      return res.status(404).json({ message: 'Shift data not found.' });
    }

    res.status(200).json(appData);
  } catch (error) {
    console.error('Error fetching shift data:', error);
    res.status(500).json({ message: 'Error fetching shift data.', error });
  }
});

router.patch(
  '/start',
  upload.fields([
    { name: 'front', maxCount: 1 },
    { name: 'back', maxCount: 1 },
    { name: 'left', maxCount: 1 },
    { name: 'right', maxCount: 1 },
    { name: 'top', maxCount: 1 },
    { name: 'bottom', maxCount: 1 },
    { name: 'dashboardImage', maxCount: 1 },
    { name: 'extra1', maxCount: 1 },
    { name: 'extra2', maxCount: 1 },
    { name: 'extra3', maxCount: 1 },
    { name: 'signature', maxCount: 1 }, // Accept signature

  ]),
  async (req, res) => {
    const AppData = req.db.model('AppData', require('../models/appdata').schema);
    const Schedule = req.db.model('Schedule', require('../models/Schedule').schema);

    try {
      const { driverId, user_ID, schedule_ID, day, startShiftTimestamp, latitude, longitude, startMiles, signed } = req.body;

      if (signed !== 'true') {
        return res.status(400).json({ message: 'Signature is required to start the shift.' });
      }

      // Check if the schedule_ID exists in the Schedule table
      const schedule = await Schedule.findById(schedule_ID);
      if (!schedule) {
        return res.status(404).json({ message: 'Schedule not found.' });
      }


      // Validate the day field
      const queryDate = new Date(schedule.day);
      if (isNaN(queryDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date format for "day".' });
      }


      // Validate mandatory images
      // const mandatoryImages = [];
      const mandatoryImages = ['front', 'back', 'left', 'right', 'top', 'bottom', 'dashboardImage'];
      const missingImages = mandatoryImages.filter((img) => !req.files[img]);

      if (missingImages.length > 0) {
        return res.status(400).json({
          message: `Missing mandatory images: ${missingImages.join(', ')}`,
        });
      }

      // Upload signature to S3
      let signatureUrl = '';
      if (req.files['signature']) {
        const signatureFile = req.files['signature'][0];
        const uploadResult = await uploadToS3(req.db.db.databaseName, signatureFile, user_ID, 'start-shift-signatures', 'signature');
        signatureUrl = uploadResult.url;
      }

      // Upload images to S3
      const imageUrls = {};
      for (const key in req.files) {
        if (req.files[key] && req.files[key][0]) {
          const file = req.files[key][0];
          const uploadResult = await uploadToS3(req.db.db.databaseName, file, user_ID, 'start-shift-images', key); // Pass user_ID
          imageUrls[key] = uploadResult.url;
        }
      }

      // Prepare start shift data
      const startShiftData = {
        startShiftTimestamp: startShiftTimestamp || new Date().toISOString(),
        location: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        },
        startMiles: startMiles || '',
        signed: true, // Store signed flag
        signature: signatureUrl, // Store signature URL
        images: {
          front: imageUrls.front,
          back: imageUrls.back,
          left: imageUrls.left,
          right: imageUrls.right,
          top: imageUrls.top,
          bottom: imageUrls.bottom,
          dashboardImage: imageUrls.dashboardImage,
          extra1: imageUrls.extra1 || '',
          extra2: imageUrls.extra2 || '',
          extra3: imageUrls.extra3 || '',
        },
      };

      // Create or update AppData record
      let appData = await AppData.findOne({ driverId: schedule.driverId, user_ID, schedule_ID, day: queryDate });

      if (!appData) {
        // Create a new record if none exists
        appData = new AppData({ driverId: schedule.driverId, user_ID, schedule_ID, day: queryDate });
      }

      appData.startShiftChecklist = startShiftData;
      await appData.save();

      // Update the status in the Schedule table
      schedule.status = 'in_progress'; // Set status to in_progress
      await schedule.save();

      sendToClients(req.db, {
        type: 'AppDataUpdated', // Custom event to signal data update
      });

      res.status(200).json({ message: 'Start shift data saved successfully.', appData });
    } catch (error) {
      console.error('Error saving start shift data:', error);
      res.status(500).json({ message: 'Error saving start shift data.', error: error.message });
    }
  }
);


/**
 * PATCH EndShiftChecklist
 * Update shift data in AppData table when the user ends a shift
 */
router.patch(
  '/end',
  upload.fields([
    { name: 'e_front', maxCount: 1 },
    { name: 'e_back', maxCount: 1 },
    { name: 'e_left', maxCount: 1 },
    { name: 'e_right', maxCount: 1 },
    { name: 'e_top', maxCount: 1 },
    { name: 'e_bottom', maxCount: 1 },
    { name: 'e_dashboardImage', maxCount: 1 },
    { name: 'e_extra1', maxCount: 1 },
    { name: 'e_extra2', maxCount: 1 },
    { name: 'e_extra3', maxCount: 1 },
    { name: 'signature', maxCount: 1 }, // Accept signature

  ]),
  async (req, res) => {
    const AppData = req.db.model('AppData', require('../models/appdata').schema);
    const Schedule = req.db.model('Schedule', require('../models/Schedule').schema);
    const RateCard = req.db.model('RateCard', require('../models/RateCard').schema);

    try {
      const { driverId, user_ID, schedule_ID, day, endShiftTimestamp, latitude, longitude, endMiles, oneHourBreak, signed } = req.body;

      if (signed !== 'true') {
        return res.status(400).json({ message: 'Signature is required to end the shift.' });
      }

      if (oneHourBreak !== 'true') {
        return res.status(400).json({ message: 'One hour break is required to end the shift.' });
      }

      // Validate schedule_ID
      const schedule = await Schedule.findById(schedule_ID);
      if (!schedule) {
        return res.status(404).json({ message: 'Schedule not found.' });
      }



      const service = schedule.service; // Fetch serviceTitle from Schedule
      const week = schedule.week; // Fetch week from Schedule

      // Validate and format the day field
      const queryDate = new Date(schedule.day); // Ensure we use the day from the Schedule
      if (isNaN(queryDate.getTime())) {
        return res.status(400).json({ message: 'Invalid date format for "day".' });
      }



      // Fetch rate card for the service and week
      const rateCard = await RateCard.findOne({ serviceTitle: service, serviceWeek: week });
      if (!rateCard) {
        return res.status(404).json({ message: 'Rate card not found for the specified service and week.' });
      }

      // Fetch AppData
      const appData = await AppData.findOne({
        driverId: schedule.driverId,
        user_ID: schedule.user_ID,
        schedule_ID: schedule._id,
        day: queryDate,
      });

      if (!appData) {
        return res.status(404).json({ message: 'Checklist not found for the specified schedule.' });
      }



      // Validate mandatory images
      //  const mandatoryImages = []; // For testing
      const mandatoryImages = ['e_front', 'e_back', 'e_left', 'e_right', 'e_top', 'e_bottom', 'e_dashboardImage'];
      const missingImages = mandatoryImages.filter((img) => !req.files[img]);

      if (missingImages.length > 0) {
        return res.status(400).json({
          message: `Missing mandatory images: ${missingImages.join(', ')}`,
        });
      }

      // Upload signature to S3
      let signatureUrl = '';
      if (req.files['signature']) {
        const signatureFile = req.files['signature'][0];
        const uploadResult = await uploadToS3(req.db.db.databaseName, signatureFile, user_ID, 'end-shift-signatures', 'signature');
        signatureUrl = uploadResult.url;
      }

      // Upload images to S3
      const imageUrls = {};
      for (const key in req.files) {
        if (req.files[key] && req.files[key][0]) {
          const file = req.files[key][0];

          // Use user_ID from request body or fallback to user_ID from schedule
          const userIdForUpload = user_ID || schedule.user_ID;
          if (!userIdForUpload) {
            console.error('user_ID is missing or undefined.');
            return res.status(400).json({ message: 'user_ID is required for uploading images.' });
          }



          // Upload to S3
          const uploadResult = await uploadToS3(req.db.db.databaseName, file, userIdForUpload, 'end-shift-images', key);
          imageUrls[key] = uploadResult.url;
        }
      }



      const startMiles = parseFloat(appData.startShiftChecklist.startMiles || 0);
      const mileageRate = parseFloat(rateCard.mileage);
      const calculatedEndMiles = parseFloat(endMiles);
      const finalMileage = isNaN(calculatedEndMiles)
        ? 0
        : (calculatedEndMiles - startMiles) * mileageRate;

      // Prepare end shift data
      const endShiftData = {
        endShiftTimestamp: endShiftTimestamp || new Date().toISOString(),
        location: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        },
        endMiles: calculatedEndMiles || '',
        finalMileage: isNaN(finalMileage) ? 0 : finalMileage,
        oneHourBreak: oneHourBreak === 'true', // Convert to boolean
        signed: true, // Store signed flag
        signature: signatureUrl, // Store signature URL
        images: {
          e_front: imageUrls.e_front,
          e_back: imageUrls.e_back,
          e_left: imageUrls.e_left,
          e_right: imageUrls.e_right,
          e_top: imageUrls.e_top,
          e_bottom: imageUrls.e_bottom,
          e_dashboardImage: imageUrls.e_dashboardImage,
          e_extra1: imageUrls.e_extra1 || '',
          e_extra2: imageUrls.e_extra2 || '',
          e_extra3: imageUrls.e_extra3 || '',
        },
      };


      // Store endShiftChecklist as an object
      appData.endShiftChecklist = endShiftData;
      await appData.save();


      // Update schedule status
      schedule.status = 'completed';
      await schedule.save();


      sendToClients(req.db, {
        type: 'AppDataUpdated', // Custom event to signal data update
      });

      res.status(200).json({ message: 'End shift data saved successfully.', appData });
    } catch (error) {
      console.error('Error saving end shift data:', error);
      res.status(500).json({ message: 'Error saving end shift data.', error: error.message });
    }
  }
);

router.get('/start/miles/:user_ID/:schedule_ID', async (req, res) => {

  const AppData = req.db.model('AppData', require('../models/appdata').schema);
  try {
    const { user_ID, schedule_ID } = req.params;

    const shiftData = await AppData.findOne({ user_ID, schedule_ID });

    if (!shiftData || !shiftData.startShiftChecklist.startMiles) {
      return res.status(404).json({ message: "No start miles found for this shift." });
    }

    res.status(200).json({ startMiles: shiftData.startShiftChecklist.startMiles });
  } catch (error) {
    console.error("Error fetching start miles:", error);
    res.status(500).json({ message: "Error fetching start miles.", error });
  }
});






module.exports = router;
