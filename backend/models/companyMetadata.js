const mongoose = require('mongoose');

const companyMetadataSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
  },
  companyID: {
    // The numeric prefix (e.g., 215)
    type: Number,
    required: true,
    unique: true,
  },
  companyURL: {
    // Subdomain or URL slug (e.g., "rainaltd")
    type: String,
    required: true,
  },
  companyDB: {
    // The name of the database, if needed
    type: String,
    required: true,
  },
  companyLogo: {
    type: String,
  },

  // Add any other fields you need here
}, { timestamps: true });

module.exports = mongoose.model('CompanyMetadata', companyMetadataSchema);