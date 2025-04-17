const mongoose = require('mongoose');

const incentiveSchema = new mongoose.Schema({
  site:String,
  service:String,
  month: String,
  type: String,
  rate: Number,
  addedBy:Object,
});

const Incentive = mongoose.model('Incentive', incentiveSchema);

module.exports = Incentive;