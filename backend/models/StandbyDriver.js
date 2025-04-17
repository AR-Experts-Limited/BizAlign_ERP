const mongoose = require("mongoose");

const StandbyDriverSchema =  new mongoose.Schema({
    firstName: String,
    lastName: String,
    driverId: String,
    day: Date,
    site: String,
  });
  
  const StandbyDriver = mongoose.model('StandbyDriver', StandbyDriverSchema);

module.exports = StandbyDriver;