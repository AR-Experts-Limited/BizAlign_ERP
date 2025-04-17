const mongoose = require('mongoose');

const ApplicationSettingsSchema = new mongoose.Schema({
    companyLogo: { type : String },
    primaryThemeColour: {type : String},
    secondaryThemeColour: {type : String}
});

const ApplicationSettings = mongoose.model('ApplicationSettings', ApplicationSettingsSchema);

module.exports = ApplicationSettings;