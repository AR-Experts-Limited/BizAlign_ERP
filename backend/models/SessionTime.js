const mongoose = require('mongoose');

const SessionTimeSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    user: { type: Object, required: true },
    loginTime: { type: Date, required: true },
    logoutTime: { type: Date },
    sessionDuration: { type: String },
});

const SessionTime = mongoose.model('SessionTime', SessionTimeSchema);

module.exports = SessionTime;