const mongoose = require('mongoose');

const CompanyIncentiveSchema = new mongoose.Schema({
    site: { type: String, required: true },
    week: { type: String, required: true },
    amount: { type: Number, required: true }
})

const CompanyIncentive = mongoose.model('CompanyIncentive', CompanyIncentiveSchema)

module.exports = CompanyIncentive