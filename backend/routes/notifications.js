const express = require('express');
const router = express.Router();
const Notification = require('../models/notifications')

router.get('/:site?', async (req, res) => {
  const Notification = req.db.model('Notification', require('../models/notifications').schema);
  const site = req.params.site;
  const query = site ? { "notification.site": site, targetDevice: 'website' } : { targetDevice: 'website' };
  try {
    const notification = await Notification.find(query).sort({ createdAt: -1 });
    res.json(notification);
  }
  catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error });
  }
});

router.delete('/:id', async (req, res) => {
  const Notification = req.db.model('Notification', require('../models/notifications').schema);
  const id = req.params.id
  try {
    await Notification.deleteOne({ _id: id })
    res.status(200).json({ message: 'notification cleared' })
  }
  catch (error) {
    res.status(500).json({ message: 'error clearing notification' })
  }
})


router.delete('/nf/clearall', async (req, res) => {
  const Notification = req.db.model('Notification', require('../models/notifications').schema);
  const nfId = req.body.nfId
  try {
    await Notification.deleteMany({ _id: { $in: nfId } })
    res.status(200).json({ message: 'notification cleared' })
  }
  catch (error) {
    res.status(500).json({ message: 'error clearing notification', error: error })
  }
})

router.put('', async (req, res) => {
  const Notification = req.db.model('Notification', require('../models/notifications').schema);
  try {
    const newNotification = new Notification({
      notification: req.body,
      targetDevice: "website"
    });

    await newNotification.save();
    res.status(201).json({ message: "Notification saved successfully", newNotification });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error saving notification",
      error: error.message,
      stack: error.stack
    });
  }
})

module.exports = router;