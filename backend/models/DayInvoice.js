const mongoose = require('mongoose');

const dayInvoiceSchema = new mongoose.Schema({
  driverId: { type: String, required: true },
  standbyService: { type: Object },
  user_ID: { type: String, required: true },
  driverName: { type: String, required: true },
  driverEmail: { type: String, required: true },
  driverVehicleType: { type: String, required: true },
  date: { type: Date, required: true },
  site: { type: String, required: true },
  serviceWeek: { type: String, required: true },
  mainService: { type: String, required: true },
  serviceRateforMain: { type: Number, required: true },
  additionalService: { type: String },
  additionalServiceApproval: { type: String },
  shiftTimes: { type: Object },
  incentiveDetailforMain: { type: Object },
  deductionDetail: { type: Array, "default": [] },
  installmentDetail: { type: Array, "default": [] },
  additionalServiceDetails: { type: Object },
  serviceRateforAdditional: { type: Number },
  byodRate: { type: Number, required: true },
  miles: { type: Number, required: true },
  mileage: { type: Number, required: true },
  calculatedMileage: { type: Number, required: true },
  total: { type: Number, required: true },
  approvalStatus: { type: String },
  addedBy: { type: Object },
  modifiedBy: { type: Object },
  invoiceGeneratedBy: { type: String },
  invoiceGeneratedOn: { type: String },
  csvData: { type: Object },
  invoicedoc: { type: String },
  comments: { type: Object },
  invoiceNumber: { type: Number },
  referenceNumber: { type: Number },
});

const DayInvoice = mongoose.model('DayInvoice', dayInvoiceSchema);

dayInvoiceSchema.index({ driverId: 1, date: 1 });
dayInvoiceSchema.index({ site: 1, serviceWeek: 1 });
dayInvoiceSchema.index({ driverId: 1, serviceWeek: 1 });


module.exports = DayInvoice;