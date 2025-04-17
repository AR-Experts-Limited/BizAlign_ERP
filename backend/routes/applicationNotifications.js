const express = require('express');
const { Expo } = require('expo-server-sdk');
const { sendToClients } = require('../utils/sseService');
const router = express.Router();
const expo = new Expo();

/**
 * @route   POST /api/notifications
 * @desc    Create & Send Notification (User-Specific or Broadcast)
 * @access  Private
 */
router.post('/', async (req, res) => {
  const User = req.db.model('User', require('../models/User').schema);
  const Notification = req.db.model('Notification', require('../models/notifications').schema);

  try {
    const { user_ID, title, body, data, targetDevice } = req.body;

    if (!title || !body || !targetDevice) {
      return res.status(400).json({ message: 'Title, body, and targetDevice are required.' });
    }

    let notificationData = {
      notification: {
        title,
        body,
        data: data || {},
        createdAt: new Date(),
      },
      targetDevice,
    };

    if (user_ID) {
      // User-Specific Notification
      const user = await User.findOne({ user_ID });

      if (!user || !user.expoPushTokens || user.expoPushTokens.length === 0) {
        console.warn(`User ${user_ID} is missing a push token.`);
        return res.status(404).json({ message: 'User not found or push token missing.' });
      }

      // Save notification to the database
      const notification = new Notification(notificationData);
      await notification.save();

      // Prepare push notifications for all registered tokens
      const messages = user.expoPushTokens.map((token) => ({
        to: token,
        sound: 'default',
        title,
        body,
        data: data || {},
      }));

      // Send notifications in chunks
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          await expo.sendPushNotificationsAsync(chunk);
        } catch (error) {
          console.error(`Error sending push notification to user ${user_ID}:`, error);
        }
      }

      return res.status(201).json({
        message: 'Notification sent and created successfully.',
        notification,
      });

    } else {
      // Broadcast Notification
      const users = await User.find({ expoPushTokens: { $exists: true, $ne: [] } });

      if (!users || users.length === 0) {
        return res.status(404).json({ message: 'No users with valid push tokens found.' });
      }

      // Save notification for broadcast
      const notification = new Notification(notificationData);
      await notification.save();

      // Prepare push notifications for all users
      const messages = users.flatMap((user) =>
        user.expoPushTokens.map((token) => ({
          to: token,
          sound: 'default',
          title,
          body,
          data: data || {},
        }))
      );

      // Send push notifications in chunks
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          await expo.sendPushNotificationsAsync(chunk);
        } catch (error) {
          console.error("Error sending broadcast push notifications:", error);
        }
      }

      return res.status(201).json({ message: 'Broadcast notification sent successfully.' });
    }
  } catch (error) {
    console.error('Error creating or sending notification:', error.message);
    res.status(500).json({
      message: 'Internal server error.',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/notifications/:user_ID
 * @desc    Get Notifications for a Specific User
 * @access  Private
 */
router.get('/:user_ID', async (req, res) => {
  const Notification = req.db.model('Notification', require('../models/notifications').schema);

  try {
    const { user_ID } = req.params;
    const notifications = await Notification.find({ "notification.user_ID": user_ID }).sort({ "notification.createdAt": -1 });

    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching user notifications:', error.message);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});


/**
 * @route   GET /api/notifications
 * @desc    Get All Notifications (With Optional Filtering)
 * @access  Private
 */
router.get('/', async (req, res) => {
  const Notification = req.db.model('Notification', require('../models/notifications').schema);

  try {
    const { targetDevice } = req.query;
    let filter = {};

    if (targetDevice) {
      filter.targetDevice = targetDevice;
    }

    const notifications = await Notification.find(filter).sort({ "notification.createdAt": -1 });

    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error.message);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});


/**
 * @route   PATCH /api/notifications/:id/acknowledge
 * @desc    Mark a Notification as Read & Update Schedule Acknowledgment
 * @access  Private
 */
router.patch('/:id/acknowledge', async (req, res) => {
  const Notification = req.db.model('Notification', require('../models/notifications').schema);
  const Schedule = req.db.model('Schedule', require('../models/Schedule').schema);

  try {
    const { id } = req.params;

    // Find the notification
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Extract scheduleId (if available)
    const scheduleId = notification.notification?.data?.scheduleId;

    // Update notification status to "isRead: true"
    await Notification.findByIdAndUpdate(id, { "notification.isRead": true });

    // If the notification is related to a schedule, update the schedule acknowledgment
    if (scheduleId) {
      await Schedule.findByIdAndUpdate(scheduleId, { acknowledged: true });
    }

    sendToClients(req.db, {
      type: 'scheduleUpdated', // Custom event to signal data update
    });

    res.status(200).json({
      message: 'Notification acknowledged successfully',
      scheduleUpdated: !!scheduleId // Returns true if a schedule was updated, false otherwise
    });

  } catch (error) {
    console.error('Error acknowledging notification:', error.message);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a Notification
 * @access  Private
 */
router.patch('/:id/delete', async (req, res) => {
  const Notification = req.db.model('Notification', require('../models/notifications').schema);

  try {
    const { id } = req.params;
    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Ensure 'deleted' is stored as a Boolean
    notification.deleted = true;
    await notification.save();

    res.status(200).json({ message: 'Notification marked as deleted', notification });
  } catch (error) {
    console.error('Error marking notification as deleted:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
/**
 * @route   GET /api/notifications/unacknowledged/:user_ID
 * @desc    Get Unacknowledged (Unread) Notifications for a Specific User
 * @access  Private
 */
router.get('/unacknowledged/:user_ID', async (req, res) => {
  const Notification = req.db.model('Notification', require('../models/notifications').schema);

  try {
    const { user_ID } = req.params;

    // Find unread notifications for the specific user
    const unreadNotifications = await Notification.find({
      "notification.user_ID": user_ID,
      "notification.isRead": false,
    });

    res.status(200).json({ count: unreadNotifications.length, notifications: unreadNotifications });
  } catch (error) {
    console.error('Error fetching unacknowledged notifications:', error.message);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});



module.exports = router;
