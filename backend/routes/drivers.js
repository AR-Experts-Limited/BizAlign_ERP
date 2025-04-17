const express = require('express');
const multer = require('multer'); // To handle file uploads
const router = express.Router();
const multerS3 = require('multer-s3');
const s3 = require('./aws'); // Optional: To delete files from file system
const { sendToClients } = require('../utils/sseService');

//const upload = multer({
//  storage: multerS3({
//    s3: s3,
//    bucket: process.env.AWS_S3_BUCKET_NAME,
//    acl: 'public-read',
//    key: (req, file, cb) => {
//      cb(null, `uploads/${Date.now()}-${file.originalname}`);
//    },
//  }),
//  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
//  fileFilter: (req, file, cb) => {
//    const allowedTypes = /jpeg|jpg|png|pdf/;
//    if (allowedTypes.test(file.mimetype)) {
//      cb(null, true);
//    } else {
//      cb(new Error('Invalid file type'));
//    }
//  },
//});

const getFormattedDateTime = () => {
  const now = new Date();

  const day = String(now.getDate()).padStart(2, '0'); // e.g., 30
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[now.getMonth()]; // e.g., Dec
  const year = now.getFullYear(); // e.g., 2024

  const hours = String(now.getHours()).padStart(2, '0'); // e.g., 15
  const minutes = String(now.getMinutes()).padStart(2, '0'); // e.g., 45
  const seconds = String(now.getSeconds()).padStart(2, '0'); // e.g., 12

  return `${day}${month}${year}_${hours}${minutes}${seconds}`;
};

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    contentDisposition: 'inline',
    key: (req, file, cb) => {
      const databaseName = req.db.db.databaseName
      const user_ID = req.body.user_ID;
      cb(null, `${databaseName}/${user_ID}/${file.fieldname}/${getFormattedDateTime()}/${file.originalname}`);
    },
  }),
});

// Helper function to get models from req.db
const getModels = (req) => ({
  Driver: req.db.model('Driver', require('../models/Driver').schema),
  IdCounter: req.db.model('IdCounter', require('../models/IdCounter').schema),
  Notification: req.db.model('Notification', require('../models/notifications').schema),
  User: req.db.model('User', require('../models/User').schema)
});

// Get all drivers
router.get('/', async (req, res) => {
  try {
    const { Driver } = getModels(req);
    const drivers = await Driver.find();
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching drivers', error: error.message });
  }
});

// Get site information for a driver
router.get('/siteinfo', async (req, res) => {
  const { driverId } = req.query;
  try {
    const { Driver } = getModels(req);
    const driver = await Driver.findOne({ _id: driverId });
    res.json(driver.siteSelection);
  } catch (error) {
    res.status(500).json({ message: "Error fetching driver's site", error: error.message });
  }
});

// Get driver by ID
router.get('/driverbyid', async (req, res) => {
  const { driverId } = req.query;
  try {
    const { Driver } = getModels(req);
    const driver = await Driver.findOne({ _id: driverId });
    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching driver', error: error.message });
  }
});

// Get driver by NI number
router.get('/ninumber', async (req, res) => {
  const { niNumber } = req.query;
  try {
    const { Driver } = getModels(req);
    const driver = await Driver.findOne({ nationalInsuranceNumber: niNumber });
    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching driver', error: error.message });
  }
});

// Filter drivers for standby drivers
router.get('/filter', async (req, res) => {
  const { id, site } = req.query;
  try {
    const { Driver } = getModels(req);
    const drivers = await Driver.find({ _id: { $in: id }, siteSelection: { $ne: site } });
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching drivers', error: error.message });
  }
});

// Get driver count
router.get('/count', async (req, res) => {
  try {
    const { Driver } = getModels(req);
    const driverCount = await Driver.countDocuments();
    res.json({ driverCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch driver count', error: error.message });
  }
});

// Get drivers with document expiry dates
router.get('/notifications', async (req, res) => {
  try {
    const { Driver } = getModels(req);
    const drivers = await Driver.find({}, 'transportId firstName lastName dlExpiry gtExpiry plExpiry hrExpiry ecsExpiry passportExpiry drExpiry rightToWorkExpiry passportDocument insuranceDocument drivingLicenseFrontImage drivingLicenseBackImage rightToWorkCard ecsCard expiredReasons approvedBy addedBy passportIssuedFrom activeStatus');
    res.json(drivers);
  } catch (error) {
    console.error('Error fetching drivers for notifications:', error);
    res.status(500).json({ message: 'Error fetching drivers', error: error.message });
  }
});

// Get drivers for a specific site
router.get('/:siteSelection', async (req, res) => {
  const { siteSelection } = req.params;
  try {
    const { Driver } = getModels(req);
    const drivers = await Driver.find({ siteSelection });
    res.json(drivers);
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ message: 'Error fetching drivers', error: error.message });
  }
});

// Add a new driver with file upload
router.post('/', upload.any(), async (req, res) => {
  try {
    const { Driver, IdCounter, Notification } = getModels(req);

    //const {
    //  user_ID,
    //  firstName, lastName, address, postcode, nationalInsuranceNumber, dateOfBirth, nationality, dateOfJoining, transportId, transporterName, utrNo, utrUpdatedOn, typeOfDriver, vehicleSize, Email, PhoneNo,
    //  bankName, sortCode, bankAccountNumber, accountName, bankNameCompany, sortCodeCompany, bankAccountNumberCompany, accountNameCompany, bankChoice,
    //  drivingLicenseNumber, dlValidity, dlExpiry, issueDrivingLicense, insuranceProvider, policyNumber, policyStartDate, policyEndDate, insuranceProviderG, policyNumberG, policyStartDateG, policyEndDateG, insuranceProviderP, policyNumberP, policyStartDateP, policyEndDateP,
    //  passportIssuedFrom, passportNumber, passportValidity, passportExpiry, rightToWorkValidity, rightToWorkExpiry, siteSelection, ecsInformation, ecsValidity, ecsExpiry,
    //} = req.body;
    //
    //let { addedBy } = req.body;
    //addedBy = JSON.parse(addedBy);
    //
    //let { vatDetails } = req.body;
    //if (vatDetails) {
    //  try {
    //    vatDetails = JSON.parse(vatDetails);
    //  } catch (error) {
    //    console.error('Error parsing vatDetails:', error);
    //    vatDetails = null;
    //  }
    //} else {
    //  vatDetails = null;
    //}

    const driverData = req.body;
    driverData.addedBy = JSON.parse(driverData.addedBy);

    if (driverData.vatDetails) {
      driverData.vatDetails = JSON.parse(driverData.vatDetails);
    }
    else {
      driverData.vatDetails = null;
    }

    //Save file locations to the database
    const newDriver = new Driver({
      ...driverData,
      profilePicture: '',
      insuranceDocument: '',
      drivingLicenseFrontImage: '',
      drivingLicenseBackImage: '',
      passportDocument: '',
      ecsCard: '',
      rightToWorkCard: '',
      signature: '',
      additionalDocs: {},
      docTimeStamps: {},
      MotorVehicleInsuranceCertificate: '',
      GoodsInTransitInsurance: '',
      PublicLiablity: '',
    });

    // Set file fields, use empty string if missing
    //const profilePicture = req.files?.profilePicture?.[0]?.location || '';
    //const insuranceDocument = req.files?.insuranceDocument?.[0]?.location || '';
    //const drivingLicenseFrontImage = req.files?.drivingLicenseFrontImage?.[0]?.location || '';
    //const drivingLicenseBackImage = req.files?.drivingLicenseBackImage?.[0]?.location || '';
    //const passportDocument = req.files?.passportDocument?.[0]?.location || '';
    //const ecsCard = req.files?.ecsCard?.[0]?.location || '';
    //const rightToWorkCard = req.files?.rightToWorkCard?.[0]?.location || '';
    //const signature = req.files?.signature?.[0]?.location || '';

    req.files?.forEach(file => {
      switch (file.fieldname) {
        case 'profilePicture':
        case 'signature':
          newDriver[file.fieldname] = file.location;
          newDriver.docTimeStamps.set(file.fieldname, new Date().toLocaleString());
          break;
        case 'insuranceDocument':
        case 'drivingLicenseFrontImage':
        case 'drivingLicenseBackImage':
        case 'passportDocument':
        case 'ecsCard':
        case 'rightToWorkCard':
        case 'MotorVehicleInsuranceCertificate':
        case 'GoodsInTransitInsurance':
        case 'PublicLiablity':
          newDriver[file.fieldname].original = file.location;
          newDriver[file.fieldname].timestamp = new Date();
          newDriver[file.fieldname].docApproval = true;
          //newDriver.docTimeStamps.set(file.fieldname, new Date().toLocaleString());
          break;
        default:
          const additionalDocs = {};
          const docTimeStamps = {};

          Object.keys(req.body).forEach((key) => {
            const match = key.match(/^extraDoc(\d+)_name$/);
            if (match) {
              const docIndex = match[1];
              additionalDocs[docIndex] = { name: req.body[key], files: [] };
              docTimeStamps[req.body[key]] = []; // Initialize timestamp array
            }
          });

          // Process uploaded files
          req.files.forEach((file) => {
            const match = file.fieldname.match(/^extraDoc(\d+)_file(\d+)$/);
            if (match) {
              const docIndex = match[1];
              if (additionalDocs[docIndex]) {
                additionalDocs[docIndex].files.push(file.location); // Store file URL
                docTimeStamps[additionalDocs[docIndex].name].push(new Date().toLocaleString()); // Store timestamp
              }
            }
          });

          // Store in MongoDB
          Object.values(additionalDocs).forEach((doc, index) => {
            newDriver.additionalDocs.set(doc.name, doc.files);
            newDriver.docTimeStamps.set(doc.name, docTimeStamps[doc.name]); // Associate timestamps with document name
          });
      }
    });


    // Save driver to database
    //const newDriver = new Driver({
    //  user_ID,
    //  firstName, lastName, address, postcode, nationalInsuranceNumber, dateOfBirth, nationality, dateOfJoining, transportId, transporterName, utrNo, utrUpdatedOn, vatDetails, typeOfDriver, vehicleSize, Email, PhoneNo,
    //  bankName, sortCode, bankAccountNumber, accountName, bankNameCompany, sortCodeCompany, bankAccountNumberCompany, accountNameCompany, bankChoice,
    //  drivingLicenseNumber, dlValidity, dlExpiry, issueDrivingLicense, activeStatus: 'Active', addedBy, insuranceProvider, policyNumber, policyStartDate, policyEndDate, insuranceProviderG, policyNumberG, policyStartDateG, policyEndDateG, insuranceProviderP, policyNumberP, policyStartDateP, policyEndDateP,
    //  passportIssuedFrom, passportNumber, passportValidity, passportExpiry, rightToWorkValidity, rightToWorkExpiry, siteSelection, ecsInformation, ecsValidity, ecsExpiry,
    //  profilePicture, insuranceDocument, drivingLicenseFrontImage, drivingLicenseBackImage, passportDocument, ecsCard, rightToWorkCard, signature,
    //});

    const newDriverData = await newDriver.save();

    // Save notification
    //const notification = {
    //  driver: newDriverData._id,
    //  site: newDriverData.siteSelection,
    //  changed: 'drivers',
    //  message: `Driver ${newDriverData.firstName} ${newDriverData.lastName} has been newly added to ${newDriverData.siteSelection}`,
    //};
    //await new Notification({ notification, targetDevice: 'website' }).save();

    const notification = { driver: newDriverData._id, site: driverData.siteSelection, changed: 'drivers', message: `Driver ${driverData.firstName + ' ' + driverData.lastName} has been newly added to ${driverData.siteSelection}` }
    const newNotification = new Notification({ notification, targetDevice: 'website' })
    await newNotification.save()

    res.status(201).json(newDriver);
  } catch (error) {
    console.error('Error adding driver:', error.message, error.stack); // Detailed error logging
    res.status(500).json({ message: 'Error adding driver', error: error.message });
  }
});

// Update driver details
router.put('/:id', async (req, res) => {
  try {
    const { Driver, Notification, User } = getModels(req);
    const originalDriver = await Driver.findById(req.params.id);

    const {
      firstName, lastName, address, postcode, nationalInsuranceNumber, dateOfBirth, nationality, dateOfJoining, transportId, transporterName, utrNo, utrUpdatedOn, vatDetails, typeOfDriver, vehicleSize, Email, PhoneNo,
      bankName, sortCode, bankAccountNumber, accountName, bankNameCompany, sortCodeCompany, bankAccountNumberCompany, accountNameCompany, bankChoice,
      drivingLicenseNumber, dlValidity, dlExpiry, issueDrivingLicense, activeStatus, expiredReasons, addedBy, insuranceProvider, policyNumber, policyStartDate, policyEndDate, insuranceProviderG, policyNumberG, policyStartDateG, policyEndDateG, insuranceProviderP, policyNumberP, policyStartDateP, policyEndDateP,
      passportIssuedFrom, passportNumber, passportValidity, passportExpiry, rightToWorkValidity, rightToWorkExpiry, siteSelection, ecsInformation, ecsValidity, ecsExpiry, delReqStatus,
    } = req.body;

    const updatedDriver = await Driver.findByIdAndUpdate(
      req.params.id,
      {
        firstName, lastName, address, postcode, nationalInsuranceNumber, dateOfBirth, nationality, dateOfJoining, transportId, transporterName, utrNo, utrUpdatedOn, vatDetails, typeOfDriver, vehicleSize, Email, PhoneNo,
        bankName, sortCode, bankAccountNumber, accountName, bankNameCompany, sortCodeCompany, bankAccountNumberCompany, accountNameCompany, bankChoice,
        drivingLicenseNumber, dlValidity, dlExpiry, issueDrivingLicense, activeStatus, expiredReasons, addedBy, insuranceProvider, policyNumber, policyStartDate, policyEndDate, insuranceProviderG, policyNumberG, policyStartDateG, policyEndDateG, insuranceProviderP, policyNumberP, policyStartDateP, policyEndDateP,
        passportIssuedFrom, passportNumber, passportValidity, passportExpiry, rightToWorkValidity, rightToWorkExpiry, siteSelection, ecsInformation, ecsValidity, ecsExpiry, delReqStatus,
      },
      { new: true }
    );

    // Updating associated user
    const updatedUser = await User.findOneAndUpdate(
      { user_ID: updatedDriver.user_ID },
      {
        firstName: updatedDriver.firstName,
        lastName: updatedDriver.lastName,
        email: updatedDriver.Email
      },
      { new: true }
    );    

    const updatedFields = {};

    if (originalDriver.siteSelection !== updatedDriver.siteSelection) {
      updatedFields.siteSelection = {
        before: originalDriver.siteSelection,
        after: updatedDriver.siteSelection,
      };
      const notification = {
        driver: updatedDriver._id,
        site: [updatedFields.siteSelection.before, updatedFields.siteSelection.after],
        changed: 'drivers',
        message: `Driver ${firstName} ${lastName} was changed from site ${updatedFields.siteSelection.before} to ${updatedFields.siteSelection.after}`,
      };
      await new Notification({ notification, targetDevice: 'website' }).save();
    }

    res.json(updatedDriver);
    sendToClients(
      req.db, {
      type: 'driverUpdated', // Custom event to signal data update
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating driver', error: error.message });
  }
});

// Update driver documents
router.put('/docUpdate/:id', async (req, res) => {
  try {
    const { Driver } = getModels(req);
    const updates = req.body;
    const updatedDriver = await Driver.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    );
    res.json(updatedDriver);
  } catch (error) {
    res.status(500).json({ message: 'Error updating driver', error: error.message });
  }
});

// Delete driver and optionally delete associated files
router.delete('/:id', async (req, res) => {
  try {
    const { Driver, Notification, User } = getModels(req);
    const driver = await Driver.findById(req.params.id);

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }
    const user = await User.deleteOne({ user_ID: driver.user_ID })
    // Save notification
    const notification = {
      driver: driver._id,
      site: driver.siteSelection,
      changed: 'drivers',
      message: `Driver ${driver.firstName} ${driver.lastName} was deleted`,
    };
    await new Notification({ notification, targetDevice: 'website' }).save();

    await Driver.findByIdAndDelete(req.params.id);
    res.json({ message: 'Driver deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting driver', error: error.message });
  }
});

module.exports = router;