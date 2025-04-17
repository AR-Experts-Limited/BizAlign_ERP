// models/appdata.js
const mongoose = require('mongoose');

const DriverAvailabilitySchema = new mongoose.Schema({
    user_ID:{ type:String},
    dates: { type: [String] }
});

const DriverAvailability = mongoose.model('TestDriverAvailability', DriverAvailabilitySchema);

module.exports = DriverAvailability;