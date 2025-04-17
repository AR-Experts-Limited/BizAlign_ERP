const mongoose = require('mongoose');

const IdCounterSchema = new mongoose.Schema({
    idType: String,
    counterValue: Number,
  });
  
  const IdCounter = mongoose.model('IdCounter', IdCounterSchema);

module.exports = IdCounter;