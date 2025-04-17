const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  refreshToken: { type: String },
  role: { type: String, required: true },
  access: { type: Array, required: true },
  site: { type: String },
  siteArray: { type: Array },
  user_ID: { type: String },
  companyId: { type: String },
  expoPushTokens: { type: String },
  otp: { type: String },
  otpVerified: { type: Boolean },
  otpExpiry: { type: Date },
  delReqStatus: { type: String, default: "" },
  resetPasswordToken: { type: String },
  resetPasswordExpiry: { type: Date },
  otp: { type: String },
  otpExpiration: { type: String }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
