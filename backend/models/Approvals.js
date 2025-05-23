const mongoose = require('mongoose');

const approvalSchema = new mongoose.Schema({
    type: { type: String, required: true },
    reqData: { type: Object, required: true },
    approvalStatus: { type: String, default: "pending", required: true },
    decisionTakenBy: { type: String },
}, { timestamps: true });

const Approval = mongoose.model('Approval', approvalSchema);

module.exports = Approval;