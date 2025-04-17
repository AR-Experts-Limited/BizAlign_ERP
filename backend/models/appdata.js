// models/appdata.js
const mongoose = require('mongoose');

const AppDataSchema = new mongoose.Schema({
    driverId: { type: String, required: true },
    user_ID: { type: String, required: true }, // Add user_ID
    schedule_ID: { type: String, required: true },
    day: { type: Date, required: false }, // From Schedule table
    startShiftChecklist: {
      startShiftTimestamp: { type: Date },
      signed: { type: Boolean, default: false }, 
      signature: { type: String, default: "" }, 
      location: {
        latitude: { type: Number },
        longitude: { type: Number },
      },
      startMiles: { type: String },
      
      images: {
        front: { type: String },
        back: { type: String },
        left: { type: String },
        right: { type: String },
        top: { type: String },
        bottom: { type: String },
        dashboardImage: { type: String },
        extra1: { type: String },
        extra2: { type: String },
        extra3: { type: String },
      },
    },
    endShiftChecklist: 
      {
        endShiftTimestamp: { type: Date },
        location: {
          latitude: { type: Number },
          longitude: { type: Number },
        },
        endMiles: { type: String },
        finalMileage: { type: Number },
        oneHourBreak: { type: Boolean },
        signed: { type: Boolean, default: false }, 
        signature: { type: String, default: "" }, 
        images: {
          e_front: { type: String },
          e_back: { type: String },
          e_left: { type: String },
          e_right: { type: String },
          e_top: { type: String },
          e_bottom: { type: String },
          e_dashboardImage: { type: String },
          e_extra1: { type: String },
          e_extra2: { type: String },
          e_extra3: { type: String },
        },
      },
  });

  const AppData = mongoose.models.AppData || mongoose.model("AppData", AppDataSchema);

module.exports = AppData;