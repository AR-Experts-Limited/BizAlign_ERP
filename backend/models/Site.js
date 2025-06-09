const mongoose = require('mongoose');

const siteSchema = new mongoose.Schema({
    siteName: { type: String, required: true },
    siteKeyword: { type: String, required: true },
    siteAddress: { type: String, required: true },

});

const Site = mongoose.model('Site', siteSchema);

module.exports = Site;
