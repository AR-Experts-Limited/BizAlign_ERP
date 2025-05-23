const mongoose = require('mongoose');

const rateCardSchema = new mongoose.Schema({
  vehicleType: { type: String, required: true },
  serviceTitle: { type: String, required: true },
  serviceRate: { type: Number, required: true },
  byodRate: { type: Number, required: true },
  serviceWeek: { type: String, required: true },
  mileage: { type: Number, required: true },
  dateAdded: { type: String, required: true },
  active: { type: Boolean, required: true },
  addedBy: { type: Object },
  modifiedBy: { type: Object },
  minimumRate: { type: Number },
  vanRent: { type: Number },
  vanRentHours: { type: Number },
  hourlyRate: { type: Number },
});

const RateCard = mongoose.model('RateCard', rateCardSchema);

module.exports = RateCard;
