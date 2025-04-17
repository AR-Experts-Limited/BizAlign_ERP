const express = require('express');
const router = express.Router();

// Get all vehicles
router.get('/', async (req, res) => {
  const Vehicle = req.db.model('Vehicle',require('../models/Vehicle').schema);
  const vehicles = await Vehicle.find().populate('assignedDriver');
  res.json(vehicles);
});

// Add a new vehicle
router.post('/', async (req, res) => {
  const Vehicle = req.db.model('Vehicle',require('../models/Vehicle').schema);
  const { model, licensePlate, assignedDriver } = req.body;
  const newVehicle = new Vehicle({ model, licensePlate, assignedDriver });
  await newVehicle.save();
  res.status(201).json(newVehicle);
});

// Update a vehicle
router.put('/:id', async (req, res) => {
  const Vehicle = req.db.model('Vehicle',require('../models/Vehicle').schema);
  const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(vehicle);
});

// Delete a vehicle
router.delete('/:id', async (req, res) => {
  const Vehicle = req.db.model('Vehicle',require('../models/Vehicle').schema);
  await Vehicle.findByIdAndDelete(req.params.id);
  res.json({ message: 'Vehicle deleted' });
});

module.exports = router;
