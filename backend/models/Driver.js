const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const driverSchema = new mongoose.Schema({
  employmentStatus: { type: String, required: true },
  user_ID: { type: String, required: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  address: { type: String },
  disabled: { type: Boolean, required: false, default: false },
  disabledOn: { type: Date, required: false },
  postcode: { type: String, required: true, match: /^[A-Z0-9 ]{3,10}$/i }, // Optional format validation
  nationalInsuranceNumber: { type: String },
  dateOfBirth: { type: Date, required: true },
  nationality: { type: String, required: true },
  dateOfJoining: { type: Date, required: false },
  transportId: { type: String, required: false },
  transporterName: { type: String, required: false },
  utrNo: { type: String, required: false },
  utrUpdatedOn: { type: Date, required: false },
  companyUtrNo: { type: String, required: false },
  companyVatDetails: { type: Object, required: false },
  companyName: { type: String, required: false },
  companyRegAddress: { type: String, required: false },
  companyRegNo: { type: String, required: false },
  companyRegExpiry: { type: Date, required: false },
  vatDetails: { type: Object, required: false },
  typeOfDriver: { type: String, required: true },
  typeOfDriverTrace: {
    type: Array, required: true, default: []
  },
  customTypeOfDriver: { type: Object },
  vehicleSize: { type: String, required: true },
  Email: { type: String, required: true },
  PhoneNo: { type: String, required: true },
  addedBy: { type: Object },
  delReqStatus: { type: String, default: "Not requested" },
  ownVehicleInsuranceNA: { type: Object, required: false },

  // Bank Details Personal
  bankName: {
    type: String,
    validate: {
      validator: function (value) {
        return this.bankChoice !== 'Personal' || !!value;
      },
      message: "Bank Name is required when Bank choice is set to Personal"
    }
  },
  sortCode: { type: String },
  bankAccountNumber: { type: String },
  accountName: { type: String },

  // Bank Details Company
  bankNameCompany: {
    type: String,
    validate: {
      validator: function (value) {
        return this.bankChoice !== 'Company' || !!value;
      },
      message: "Bank Name is required when Bank choice is set to Company"
    }
  },
  sortCodeCompany: { type: String },
  bankAccountNumberCompany: { type: String },
  accountNameCompany: { type: String },

  // Bank Details toggler
  bankChoice: { type: String, required: true },

  // Motor Vehicle Insurance Policy Details
  insuranceProvider: {
    type: String,
    validate: {
      validator: function (value) {
        return this.typeOfDriver !== 'Own Vehicle' || this.ownVehicleInsuranceNA?.mvi || !!value;
      },
      message: "Motor Vehicle Insurance Provider Name is required when Vehicle Type is set to Own Vehicle"
    }
  },

  policyNumber: {
    type: String,
    validate: {
      validator: function (value) {
        return this.typeOfDriver !== 'Own Vehicle' || this.ownVehicleInsuranceNA?.mvi || !!value;
      },
      message: "Motor Vehicle Insurance Policy Number is required when Vehicle Type is set to Own Vehicle"
    }
  },

  policyStartDate: {
    type: Date,
    validate: {
      validator: function (value) {
        return this.typeOfDriver !== 'Own Vehicle' || this.ownVehicleInsuranceNA?.mvi || !!value;
      },
      message: "Motor Vehicle Insurance Policy Start Date is required when Vehicle Type is set to Own Vehicle"
    }
  },

  policyEndDate: {
    type: Date,
    validate: {
      validator: function (value) {
        return this.typeOfDriver !== 'Own Vehicle' || this.ownVehicleInsuranceNA?.mvi || !!value;
      },
      message: "Motor Vehicle Insurance Policy End Date is required when Vehicle Type is set to Own Vehicle"
    }
  },

  // Goods  Vehicle Insurance Policy Details
  insuranceProviderG: {
    type: String,
    validate: {
      validator: function (value) {
        return this.typeOfDriver !== 'Own Vehicle' || this.ownVehicleInsuranceNA?.goods || !!value;
      },
      message: "Goods InTransit Insurance Provider Name is required when Vehicle Type is set to Own Vehicle"
    }
  },

  policyNumberG: {
    type: String,
    validate: {
      validator: function (value) {
        return this.typeOfDriver !== 'Own Vehicle' || this.ownVehicleInsuranceNA?.goods || !!value;
      },
      message: "Goods InTransit Insurance Policy Number is required when Vehicle Type is set to Own Vehicle"
    }
  },

  policyStartDateG: {
    type: Date,
    validate: {
      validator: function (value) {
        return this.typeOfDriver !== 'Own Vehicle' || this.ownVehicleInsuranceNA?.goods || !!value;
      },
      message: "Goods InTransit Insurance Policy Start Date is required when Vehicle Type is set to Own Vehicle"
    }
  },

  policyEndDateG: {
    type: Date,
    validate: {
      validator: function (value) {
        return this.typeOfDriver !== 'Own Vehicle' || this.ownVehicleInsuranceNA?.goods || !!value;
      },
      message: "Goods InTransit Insurance Policy End Date is required when Vehicle Type is set to Own Vehicle"
    }
  },

  // Public Liablity Vehicle Insurance Policy Details
  insuranceProviderP: {
    type: String,
    validate: {
      validator: function (value) {
        return this.typeOfDriver !== 'Own Vehicle' || this.ownVehicleInsuranceNA?.public || !!value;
      },
      message: "Public Liablity Insurance Provider Name is required when Vehicle Type is set to Own Vehicle"
    }
  },

  policyNumberP: {
    type: String,
    validate: {
      validator: function (value) {
        return this.typeOfDriver !== 'Own Vehicle' || this.ownVehicleInsuranceNA?.public || !!value;
      },
      message: "Public Liablity Insurance Policy Number is required when Vehicle Type is set to Own Vehicle"
    }
  },

  policyStartDateP: {
    type: Date,
    validate: {
      validator: function (value) {
        return this.typeOfDriver !== 'Own Vehicle' || this.ownVehicleInsuranceNA?.public || !!value;
      },
      message: "Public Liablity Insurance Policy Start Date is required when Vehicle Type is set to Own Vehicle"
    }
  },

  policyEndDateP: {
    type: Date,
    validate: {
      validator: function (value) {
        return this.typeOfDriver !== 'Own Vehicle' || this.ownVehicleInsuranceNA?.public || !!value;
      },
      message: "Public Liablity Insurance Policy End Date is required when Vehicle Type is set to Own Vehicle"
    }
  },

  vehicleRegPlate: {
    type: String,
    validate: {
      validator: function (value) {
        return this.typeOfDriver !== 'Own Vehicle' || !!value;
      },
      message: "Vehicle Registration Plate is required when Vehicle Type is set to Own Vehicle"
    }
  },

  // Driving License Info
  drivingLicenseNumber: { type: String, maxlength: 20 },  // Optional length validation
  dlValidity: { type: Date },
  dlExpiry: { type: Date }, // Optional date range validation
  issueDrivingLicense: { type: Date },

  // Passport & Right to Work
  passportIssuedFrom: { type: String },
  passportNumber: { type: String },
  passportValidity: { type: Date },
  passportExpiry: { type: Date },
  rightToWorkValidity: { type: Date },
  rightToWorkExpiry: { type: Date },
  siteSelection: { type: String, required: true },
  ecsInformation: { type: Boolean, default: false },
  ecsValidity: { type: Date },  // Default value added
  ecsExpiry: { type: Date },
  // File Uploads
  profilePicture: [
    {
      original: { type: String },
      timestamp: { type: Date }
    }
  ],
  insuranceDocument: [
    {
      original: { type: String },
      temp: { type: String },
      docApproval: { type: Boolean, default: false },
      timestamp: { type: Date },
      approvedBy: { type: String }
    }
  ],
  drivingLicenseFrontImage: [
    {
      original: { type: String },
      temp: { type: String },
      docApproval: { type: Boolean, default: false },
      timestamp: { type: Date },
      approvedBy: { type: Object }
    }
  ],
  drivingLicenseBackImage: [
    {
      original: { type: String },
      temp: { type: String },
      docApproval: { type: Boolean, default: false },
      timestamp: { type: Date },
      approvedBy: { type: Object }
    }
  ],
  passportDocument: [
    {
      original: { type: String },
      temp: { type: String },
      docApproval: { type: Boolean, default: false },
      timestamp: { type: Date },
      approvedBy: { type: Object }
    }
  ],
  ecsCard: [
    {
      original: { type: String },
      temp: { type: String },
      docApproval: { type: Boolean, default: false },
      timestamp: { type: Date },
      approvedBy: { type: Object }
    }
  ],
  rightToWorkCard: [
    {
      original: { type: String },
      temp: { type: String },
      docApproval: { type: Boolean, default: false },
      timestamp: { type: Date },
      approvedBy: { type: Object }
    }
  ],
  MotorVehicleInsuranceCertificate: [
    {
      original: { type: String },
      temp: { type: String },
      docApproval: { type: Boolean, default: false },
      timestamp: { type: Date },
      approvedBy: { type: Object }
    }
  ],
  GoodsInTransitInsurance: [
    {
      original: { type: String },
      temp: { type: String },
      docApproval: { type: Boolean, default: false },
      timestamp: { type: Date },
      approvedBy: { type: Object }
    }
  ],
  PublicLiablity: [
    {
      original: { type: String },
      temp: { type: String },
      docApproval: { type: Boolean, default: false },
      timestamp: { type: Date },
      approvedBy: { type: Object }
    }
  ],
  signature: [
    {
      original: { type: String },
      timestamp: { type: Date }
    }
  ],
  companyRegistrationCertificate: [
    {
      original: { type: String },
      temp: { type: String },
      docApproval: { type: Boolean, default: false },
      timestamp: { type: Date },
      approvedBy: { type: Object }
    }
  ],
  additionalDocs: {
    type: Map,
    of: {
      type: [[
        new mongoose.Schema({
          original: String,
          timestamp: Date,
          approvedBy: Object
        })
      ]]
    }
  },
  docTimeStamps: {
    type: Map,
    of: Schema.Types.Mixed,
  },
  
  activeStatus: { type: String },

  suspended: { type: String },

  expiredReasons: {
    type: [String],
    required: false,
    default: [],
  }

}, { timestamps: true });  // Add timestamps for creation and update times

const Driver = mongoose.model('Driver', driverSchema);
module.exports = Driver;
