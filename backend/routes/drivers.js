const express = require('express');
const multer = require('multer'); // To handle file uploads
const router = express.Router();
const multerS3 = require('multer-s3');
const s3 = require('./aws'); // Optional: To delete files from file system
const { sendToClients } = require('../utils/sseService');
const fs = require('fs');
const nodemailer = require('nodemailer');

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
    const drivers = await Driver.find({ disabled: { $ne: true } });
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching drivers', error: error.message });
  }
});

//For Manage Drivers Component
router.get('/manage-drivers', async (req, res) => {
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
    const driver = await Driver.findOne({ _id: driverId, disabled: { $ne: true } });
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
    const driver = await Driver.findOne({ _id: driverId, disabled: { $ne: true } });
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
    const drivers = await Driver.find({ _id: { $in: id }, siteSelection: { $ne: site }, disabled: { $ne: true } });
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
// This route is used to fetch drivers whose documents are about to expire and has suspended status
router.get('/notifications', async (req, res) => {
  try {
    const { Driver } = getModels(req);
    const drivers = await Driver.find({disabled: { $ne: true }}, 'siteSelection firstName lastName dlExpiry gtExpiry plExpiry hrExpiry ecsExpiry passportExpiry drExpiry rightToWorkExpiry passportDocument insuranceDocument drivingLicenseFrontImage drivingLicenseBackImage rightToWorkCard ecsCard expiredReasons approvedBy addedBy passportIssuedFrom activeStatus suspended typeOfDriver policyEndDate');
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
    const drivers = await Driver.find({ siteSelection, disabled: { $ne: true } });
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

    if (driverData.typeOfDriver == "Own Vehicle") {
      driverData.ownVehicleInsuranceNA = JSON.parse(driverData.ownVehicleInsuranceNA);
    }

    if (driverData.vatDetails) {
      driverData.vatDetails = JSON.parse(driverData.vatDetails);
    }
    else {
      driverData.vatDetails = null;
    }

    if (driverData.companyVatDetails) {
      driverData.companyVatDetails = JSON.parse(driverData.companyVatDetails);
    }
    else {
      driverData.companyVatDetails = null;
    }

    //Save file locations to the database
    const newDriver = new Driver({
      ...driverData,
      //profilePicture: [],
      //insuranceDocument: [],
      //drivingLicenseFrontImage: [],
      //drivingLicenseBackImage: [],
      //passportDocument: [],
      //ecsCard: [],
      //rightToWorkCard: [],
      //signature: [],
      additionalDocs: {},
      docTimeStamps: {},
      //MotorVehicleInsuranceCertificate: "",
      //GoodsInTransitInsurance: "",
      //PublicLiablity: "",
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
      const docEntry = {
        original: file.location,
        temp: '',
        docApproval: true,
        timestamp: new Date(),
        approvedBy: '',
      };

      const docEntrySmall = {
        original: file.location,
        timestamp: new Date()
      }

      switch (file.fieldname) {
        case 'profilePicture':
        case 'signature':
          if (!Array.isArray(newDriver[file.fieldname])) {
            newDriver[file.fieldname] = [];
          }
          newDriver[file.fieldname].push(docEntrySmall);
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
          if (!Array.isArray(newDriver[file.fieldname])) {
            newDriver[file.fieldname] = [];
          }
          newDriver[file.fieldname].push(docEntry);
          break;

        //newDriver[file.fieldname].original = file.location;
        //newDriver[file.fieldname].timestamp = new Date();
        //newDriver[file.fieldname].docApproval = true;
        //newDriver.docTimeStamps.set(file.fieldname, new Date().toLocaleString());
        //break;
        default:
          const additionalDocs = new Map();

          // Detect additional docs headers from request
          Object.keys(req.body).forEach((key) => {
            const match = key.match(/^extraDoc(\d+)_name$/);
            if (match) {
              const docIndex = match[1];
              const docLabel = req.body[key];
              additionalDocs.set(docLabel, []); // Each docLabel will hold an array of file groups
            }
          });

          // Store each uploaded file as its own group with 1 version
          req.files.forEach((file) => {
            const match = file.fieldname.match(/^extraDoc(\d+)_file(\d+)$/);
            if (match) {
              const docIndex = match[1];
              const docLabel = req.body[`extraDoc${docIndex}_name`];

              if (additionalDocs.has(docLabel)) {
                const fileVersion = {
                  original: file.location,
                  temp: '',
                  docApproval: true,
                  timestamp: new Date(),
                  approvedBy: '',
                };

                // Each uploaded file gets its own file group: [ { version1 } ]
                const currentGroups = additionalDocs.get(docLabel);
                currentGroups.push([fileVersion]);
              }
            }
          });

          newDriver.additionalDocs = additionalDocs;

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

router.post('/driverDisableEmail', async (req, res) => {

  const {email} = req.body;

  try {

  const transporter = nodemailer.createTransport({
    service: 'gmail', // or your chosen email service
    auth: {
      user: process.env.MAILER_EMAIL, // Your email address
      pass: process.env.MAILER_APP_PASSWORD, // Your email password or app password
    },
  });

  
  const mailOptions = {
    from: process.env.MAILER_EMAIL, // Sender address
    to: email, // Receiver address (user's email)
    cc: "fleet@rainaltd.com",
    subject: 'Vehicle Return - Off Hire',
    html: `
      <div>
      <p>Dear Independent Contractor,</p>

      <p>Please accept this communication to inform you that the vehicle hired yourself has been returned to us. To complete the Off-Hire process, our Fleet Team will now carry out a thorough inspection of the vehicle.
      If any new damages or issues are identified during the inspection, you will receive a detailed email containing:

      <ul>
      <li>On-Hire photographs</li>
      <li>Off-Hire photographs</li>
      <li>Supporting photographs of any damages (if applicable)</li>
      <li>An estimate or invoice for any necessary repairs</li>
      <li>If no further issues are found, no additional communication will be required.</li>

      <p>
      Regarding Final Payment:
      If applicable, your final payment will be processed once the off-hire inspection is complete within 30 days and all matters (including potential damage costs) are settled. If you do not receive payment, and no response has been provided within 30 days, please contact us at admin@rainaltd.com.</p>
      
      <p>Thank you for your cooperation. Should you have any questions or require further assistance, please email admin@rainaltd.com</p>

      <p>
      Best regards,</br>
      Raina Ltd</br>
      </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  return res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error("Error sending Email:", error);
  }
});

// Route to Add new Version of a File
router.post('/upload-version', upload.any(), async (req, res) => {
  try {
    const { Driver } = getModels(req);
    const { driverId, fieldName, approvedBy } = req.body;
    const file = req.files?.find(f => f.fieldname === fieldName);

    if (!driverId || !fieldName || !file) {
      return res.status(400).json({ message: "Missing required data" });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const newVersion = {
      original: file.location,
      temp: '',
      docApproval: true,
      timestamp: new Date(),
      approvedBy: JSON.parse(approvedBy), // Optional: populate with req.user, etc.
    };

    // Ensure the array exists
    if (!Array.isArray(driver[fieldName])) {
      driver[fieldName] = [];
    }

    // Add new version
    driver[fieldName].push(newVersion);

    await driver.save();
    res.status(200).json({ message: 'New document version uploaded successfully', version: newVersion });
  } catch (err) {
    console.error("Error uploading new version:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Route to upload new version of Additional Document
router.post('/upload-additional-version', upload.any(), async (req, res) => {
  try {
    const { Driver } = getModels(req);
    const { driverId, docLabel, fileGroupIndex } = req.body;
    const file = req.files?.[0];

    if (!driverId || !docLabel || fileGroupIndex === undefined || !file) {
      return res.status(400).json({ message: "Missing required data" });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) return res.status(404).json({ message: "Driver not found" });

    const newVersion = {
      original: file.location,
      temp: '',
      docApproval: true,
      timestamp: new Date(),
      approvedBy: ''
    };

    // Ensure additionalDocs is initialized
    if (!driver.additionalDocs.has(docLabel)) {
      driver.additionalDocs.set(docLabel, []);
    }

    const docGroups = [...driver.additionalDocs.get(docLabel)]; // clone array
    const groupIndex = parseInt(fileGroupIndex);

    // Ensure group exists
    if (!Array.isArray(docGroups[groupIndex])) {
      docGroups[groupIndex] = [];
    }

    // Push new version
    docGroups[groupIndex].push(newVersion);

    // Now overwrite the key safely
    driver.additionalDocs.set(docLabel, docGroups);

    await driver.save();

    return res.status(200).json({ message: "Version uploaded successfully", version: newVersion });
  } catch (err) {
    console.error("Error uploading additionalDoc version:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post('/delete-version', async (req, res) => {
  const { Driver } = getModels(req);
  const { driverId, fieldName, versionIndex } = req.body;

  if (!driverId || !fieldName || versionIndex === undefined) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  try {
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    const versions = driver[fieldName];
    if (!Array.isArray(versions)) {
      return res.status(400).json({ success: false, message: "Field is not an array of versions" });
    }

    const deletedVersion = versions.splice(versionIndex, 1); // Remove the version
    driver[fieldName] = versions;
    await driver.save();

    return res.json({ success: true, message: "Version deleted successfully" });

  } catch (error) {
    console.error("Delete version error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post('/delete-additional-version', async (req, res) => {
  try {
    const { Driver } = getModels(req);
    const { driverId, docLabel, fileGroupIndex, versionIndex } = req.body;

    if (!driverId || !docLabel || fileGroupIndex === undefined || versionIndex === undefined) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    // ✅ Deep clone the array to ensure we replace it fully
    const existing = driver.additionalDocs.get(docLabel);
    const cloned = existing ? JSON.parse(JSON.stringify(existing)) : [];

    if (!Array.isArray(cloned[fileGroupIndex]) || !cloned[fileGroupIndex][versionIndex]) {
      return res.status(400).json({ success: false, message: "Invalid group/version index" });
    }

    // Delete version
    cloned[fileGroupIndex].splice(versionIndex, 1);

    // If file group is empty, remove it
    if (cloned[fileGroupIndex].length === 0) {
      cloned.splice(fileGroupIndex, 1);
    }

    // ✅ Overwrite the full Map entry
    driver.additionalDocs.set(docLabel, cloned);

    await driver.save();

    return res.json({ success: true, message: "Version deleted successfully" });

  } catch (error) {
    console.error("Delete additional version error:", error);
    return res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});


// Update driver details
router.put('/:id', async (req, res) => {
  try {
    const { Driver, Notification, User } = getModels(req);
    const originalDriver = await Driver.findById(req.params.id);

    const {
      firstName, lastName, address, postcode, nationalInsuranceNumber, dateOfBirth, nationality, dateOfJoining, transportId, transporterName, utrNo, utrUpdatedOn, vatDetails, typeOfDriver, typeOfDriverTrace, customTypeOfDriver, vehicleSize, Email, PhoneNo,
      bankName, sortCode, bankAccountNumber, accountName, bankNameCompany, sortCodeCompany, bankAccountNumberCompany, accountNameCompany, bankChoice, companyUtrNo, companyVatDetails, companyRegNo, employmentStatus,
      drivingLicenseNumber, dlValidity, dlExpiry, issueDrivingLicense, activeStatus, suspended, expiredReasons, addedBy, insuranceProvider, policyNumber, policyStartDate, policyEndDate, companyName, companyRegAddress, insuranceProviderG, policyNumberG, policyStartDateG, policyEndDateG, insuranceProviderP, policyNumberP, policyStartDateP, policyEndDateP,
      passportIssuedFrom, passportNumber, passportValidity, passportExpiry, rightToWorkValidity, rightToWorkExpiry, siteSelection, ecsInformation, ecsValidity, ecsExpiry, delReqStatus, companyRegExpiryDate, ownVehicleInsuranceNA, vehicleRegPlate, disabled, disabledOn
    } = req.body;

    const updatedDriver = await Driver.findByIdAndUpdate(
      req.params.id,
      {
        firstName, lastName, address, postcode, nationalInsuranceNumber, dateOfBirth, nationality, dateOfJoining, transportId, transporterName, utrNo, utrUpdatedOn, vatDetails, typeOfDriver, typeOfDriverTrace, customTypeOfDriver, vehicleSize, Email, PhoneNo,
        bankName, sortCode, bankAccountNumber, accountName, bankNameCompany, sortCodeCompany, bankAccountNumberCompany, accountNameCompany, bankChoice, companyUtrNo, companyVatDetails, companyRegNo, employmentStatus,
        drivingLicenseNumber, dlValidity, dlExpiry, issueDrivingLicense, activeStatus, suspended, expiredReasons, addedBy, insuranceProvider, policyNumber, policyStartDate, policyEndDate, companyName, companyRegAddress, insuranceProviderG, policyNumberG, policyStartDateG, policyEndDateG, insuranceProviderP, policyNumberP, policyStartDateP, policyEndDateP,
        passportIssuedFrom, passportNumber, passportValidity, passportExpiry, rightToWorkValidity, rightToWorkExpiry, siteSelection, ecsInformation, ecsValidity, ecsExpiry, delReqStatus, companyRegExpiryDate, ownVehicleInsuranceNA, vehicleRegPlate, disabled, disabledOn
      },
      { new: true }
    );

    //if(ownVehicleInsuranceNA) {
    //  ownVehicleInsuranceNA = JSON.parse(ownVehicleInsuranceNA);
    //}

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