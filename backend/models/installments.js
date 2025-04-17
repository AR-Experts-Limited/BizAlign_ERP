const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema({

    driverId: { type: String, required: true }, // This could be an ID or name
    user_ID:{type:String, required:true},
    driverName: { type: String, required: true },
    installmentRate: { type: Number, required: true },
    tenure:{ type: Number, required: true },
    site:{type:String, required:true},
    installmentType:{type:String, required: true},
    installmentPending:{type:Number, required:true},
    spreadRate: { type: Number, required: true },
    installmentDocument:{type:String},
    addedBy:{type:Object},
    signed:{type:Boolean},
})

const Installment = mongoose.model('Installment', installmentSchema);

module.exports = Installment;