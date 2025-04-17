const express = require('express');
const router = express.Router();

// Update Location
router.patch('/update-location', async (req, res) => {
  const AppLocation = req.db.model('AppLocation', require('../models/AppLocation').schema)
  const { user_ID, latitude, longitude } = req.body;

  try {
    const timestamp = new Date();

    let locationData = await AppLocation.findOne({ user_ID });

    if (!locationData) {
      locationData = new AppLocation({
        user_ID,
        currentLocation: { latitude, longitude, timestamp },
        hourlyLocations: [],
      });
    } else {
      locationData.currentLocation = { latitude, longitude, timestamp };
      locationData.hourlyLocations.push({ latitude, longitude, timestamp });
    }

    await locationData.save();

    res.status(200).json({ message: 'Location updated successfully.', locationData });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ message: 'Error updating location.', error: error.message });
  }
});

// Get Location Data
router.get('/get-location', async (req, res) => {
  const AppLocation = req.db.model('AppLocation', require('../models/AppLocation').schema)
  const { user_ID } = req.query;

  try {
    // Check if the location data exists in the AppLocation collection
    const locationData = await AppLocation.find({ user_ID: { $in: user_ID } });
    console.log(locationData)
    console.log(user_ID)
    // if (!locationData || !locationData.currentLocation) {
    //   return res.status(404).json({ message: 'Location data not found or not yet available.' });
    // }

    // Respond with the latest currentLocation
    res.status(200).json(locationData);
  } catch (error) {
    console.error('Error fetching location data:', error);
    res.status(500).json({ message: 'Error fetching location data.', error: error.message });
  }
});



// New request-location endpoint
router.post('/request-location', async (req, res) => {
  const AppLocation = req.db.model('AppLocation', require('../models/AppLocation').schema)
  const User = req.db.model('User', require('../models/User').schema)
  const { user_ID } = req.body;

  try {
    // Retrieve the push notification token from the TestUsers collection
    const user = await User.findOne({ user_ID }); // Corrected this line
    const locationData = await AppLocation.findOne({ user_ID });

    if (!user || !user.expoPushToken) {
      return res.status(404).json({ message: 'Push notification token not found for this driver.' });
    }

    // Send a push notification to the app to fetch real-time location
    const message = {
      to: user.expoPushToken,
      sound: 'default',
      title: 'Location Accessed',
      body: `Please provide your current location.`,
      data: { user_ID },
    };

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    await AppLocation.updateOne({ user_ID }, {
      $set: {
        locationRequest: 'pending'
      }
    })

    res.status(200).json({
      message: 'Location request sent to the driver. Awaiting response from the app.',
    });
  } catch (error) {
    console.error('Error accessing location:', error);
    res.status(500).json({
      message: 'Error accessing location.',
      error: error.message,
    });
  }
});


module.exports = router;
