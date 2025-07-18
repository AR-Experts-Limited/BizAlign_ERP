// models/Deduction.js
const mongoose = require('mongoose');

const DeductionSchema = new mongoose.Schema({
    site: { type: String, required: true },
    driverId: { type: String, required: true },
    user_ID: { type: String, required: true },
    driverName: { type: String, required: true }, // This could be an ID or name
    serviceType: { type: String, required: true },
    rate: { type: Number, required: true },
    date: { type: Date, required: true },
    deductionDocument: { type: String },
    addedBy: { type: Object },
    signed: { type: Boolean, required: true },
    week: { type: String },
    vehicleRegPlate: { type: String },
});

const Deduction = mongoose.model('Deduction', DeductionSchema);
DeductionSchema.index({ driverId: 1, date: 1 })

module.exports = Deduction;
