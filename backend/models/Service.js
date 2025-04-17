const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
    title: String,
    hours: Number,
  });
  
  const Service = mongoose.model('Service', ServiceSchema);

module.exports = Service;