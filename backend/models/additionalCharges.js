const mongoose = require('mongoose');

const AdditionalChargesSchema = new mongoose.Schema({
    driverId: { type: String, required: true },
    driverName: { type: String, required: true },
    site: { type: String, required: true },
    week: { type: String, required: true },
    title: { type: String, required: true },
    type: { type: String, required: true },
    rate: { type: Number, required: true }

})
AdditionalChargesSchema.index({ driverId: 1, week: 1 }, { unique: true });

const AdditionalCharges = mongoose.model('AdditionalCharges', AdditionalChargesSchema)

module.exports = AdditionalCharges