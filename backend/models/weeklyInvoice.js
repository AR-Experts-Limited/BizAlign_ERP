const mongoose = require('mongoose');

const weeklyInvoiceSchema = new mongoose.Schema({
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        index: true,
    },
    serviceWeek: {
        type: String,
        required: true,
        index: true,
    },
    site: String,
    invoices: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'DayInvoice',
        },
    ],
    installments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Installment',
        },
    ],
    installmentDetail: [
        {
            _id: mongoose.Schema.Types.ObjectId, // Installment ID
            installmentRate: Number,
            installmentType: String,
            installmentDocument: String,
            deductionAmount: Number,
            installmentPending: Number,
            signed: Boolean,
        }
    ],
    additionalChargesDetail: Array,
    count: Number,
    invoiceGeneratedBy: String,
    invoiceGeneratedOn: Date,
    standbyService: Boolean,
    referenceNumber: String,
    unsigned: Boolean,
    vatTotal: Number,
    downloadInvoice: Array,
    sentInvoice: Array,
    total: Number,
});

// Compound index for uniqueness
weeklyInvoiceSchema.index({ driverId: 1, serviceWeek: 1 }, { unique: true });

module.exports = mongoose.model('WeeklyInvoice', weeklyInvoiceSchema);
