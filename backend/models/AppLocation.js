const mongoose = require('mongoose');

const appLocationSchema = new mongoose.Schema({
  user_ID: { type: String, required: true, unique: true },
  currentLocation: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    timestamp: { type: Date, required: true },
  },
  hourlyLocations: [
    {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      timestamp: { type: Date, required: true },
    },
  ],
  locationRequest: {type:String},
});

const AppLocation = mongoose.model('AppLocation', appLocationSchema);

module.exports = AppLocation;
