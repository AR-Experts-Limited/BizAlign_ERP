const mongoose = require('mongoose');

const incentiveSchema = new mongoose.Schema({
  site: String,
  driverId: String,
  routeSupportService: String,
  service: String,
  startDate: Date,
  endDate: Date,
  type: String,
  associatedDeduction: { type: mongoose.Schema.Types.ObjectId, ref: 'Deduction' },
  rate: Number,
  addedBy: Object,
});

const Incentive = mongoose.model('Incentive', incentiveSchema);
incentiveSchema.index({ service: 1, site: 1, month: 1 })

module.exports = Incentive;