const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  notification: { type: Object},
  targetDevice: {type:String},
  createdAt: {
    type: Date,
    default: Date.now, // Automatically set the timestamp
  },
  deleted: { 
    type: Boolean, 
    default: false, // Soft delete flag (false means visible)
  },
});

const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = Notification;
