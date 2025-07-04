const mongoose = require('mongoose');

const AppVersionSchema = new mongoose.Schema({
  platform: {
    type: String,
    enum: ['ios', 'android'],
    required: true,
  },
  version: {
    type: String,
    required: true,
  },
  releaseDate: {
    type: Date,
    default: Date.now,
  },
});

const AppVersion = mongoose.model('AppVersion', AppVersionSchema);
module.exports = AppVersion;
