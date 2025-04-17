const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  model: { type: String, required: true },
  licensePlate: { type: String, required: true, unique: true },
  status: { type: String, default: 'active' },
  assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' } // Refers to Driver collection
});

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

module.exports = Vehicle;
