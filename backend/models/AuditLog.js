const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  message: { type : String, required: true },
  logUser: { type : Object, required: true },
  data: { type: Object, required: true }
}, { timestamps: true });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;