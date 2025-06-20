const express = require('express');
const multer = require('multer');
const multerS3 = require('multer-s3');
const nodemailer = require('nodemailer');
const router = express.Router();
const s3 = require('./aws');
const { sendToClients } = require('../utils/sseService');

// Multer S3 configuration
const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    metadata: (req, file, cb) => cb(null, { fieldName: file.fieldname }),
    contentDisposition: 'inline',
    key: (req, file, cb) => {
      const databaseName = req.db.db.databaseName;
      const user_ID = req.body.user_ID;
      cb(null, `${databaseName}/${user_ID}/${file.fieldname}/${getFormattedDateTime()}/${file.originalname}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    if (allowedTypes.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed.'));
    }
  },
});

// Utility functions
const getFormattedDateTime = () => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[now.getMonth()];
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${day}${month}${year}_${hours}${minutes}${seconds}`;
};

const getModels = (req) => ({
  Driver: req.db.model('Driver', require('../models/Driver').schema),
  IdCounter: req.db.model('IdCounter', require('../models/IdCounter').schema),
  Notification: req.db.model('Notification', require('../models/notifications').schema),
  User: req.db.model('User', require('../models/User').schema),
});

const parseJsonField = (data, fieldName) => {
  try {
    return data[fieldName] ? JSON.parse(data[fieldName]) : null;
  } catch (error) {
    console.error(`Error parsing ${fieldName}:`, error);
    return null;
  }
};

const createFileEntry = (file, isSmall = false) => {
  const entry = {
    original: file.location,
    timestamp: new Date(),
  };
  if (!isSmall) {
    entry.temp = '';
    entry.docApproval = true;
    entry.approvedBy = '';
  }
  return entry;
};

// Error handling middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    console.error(`Error in ${fn.name || 'route'}:`, error);
    res.status(500).json({ message: 'Server error', error: error.message });
  });
};

// Routes
router.get('/', asyncHandler(async (req, res) => {
  const { Driver } = getModels(req);
  const drivers = await Driver.find();
  res.json(drivers);
}));

router.get('/manage-drivers', asyncHandler(async (req, res) => {
  const { Driver } = getModels(req);
  const drivers = await Driver.find();
  res.json(drivers);
}));

router.get('/siteinfo', asyncHandler(async (req, res) => {
  const { driverId } = req.query;
  const { Driver } = getModels(req);
  const driver = await Driver.findOne({ _id: driverId, disabled: { $ne: true } });
  if (!driver) throw new Error('Driver not found');
  res.json(driver.siteSelection);
}));

router.get('/driverbyid', asyncHandler(async (req, res) => {
  const { driverId } = req.query;
  const { Driver } = getModels(req);
  const driver = await Driver.findOne({ _id: driverId, disabled: { $ne: true } });
  if (!driver) throw new Error('Driver not found');
  res.json(driver);
}));

router.get('/ninumber', asyncHandler(async (req, res) => {
  const { niNumber } = req.query;
  const { Driver } = getModels(req);
  const driver = await Driver.findOne({ nationalInsuranceNumber: niNumber });
  if (!driver) throw new Error('Driver not found');
  res.json(driver);
}));

router.get('/filter', asyncHandler(async (req, res) => {
  const { id, site } = req.query;
  const { Driver } = getModels(req);
  const drivers = await Driver.find({ _id: { $in: id }, siteSelection: { $ne: site }, disabled: { $ne: true } });
  res.json(drivers);
}));

router.get('/count', asyncHandler(async (req, res) => {
  const { Driver } = getModels(req);
  const driverCount = await Driver.countDocuments();
  res.json({ driverCount });
}));

router.get('/notifications', asyncHandler(async (req, res) => {
  const { Driver } = getModels(req);
  const fields = 'siteSelection firstName lastName dlExpiry gtExpiry plExpiry hrExpiry ecsExpiry passportExpiry drExpiry rightToWorkExpiry passportDocument insuranceDocument drivingLicenseFrontImage drivingLicenseBackImage rightToWorkCard ecsCard expiredReasons approvedBy addedBy passportIssuedFrom activeStatus suspended typeOfDriver policyEndDate';
  const drivers = await Driver.find({ disabled: { $ne: true } }, fields);
  res.json(drivers);
}));

router.get('/:siteSelection', asyncHandler(async (req, res) => {
  const { siteSelection } = req.params;
  const { Driver } = getModels(req);
  const drivers = await Driver.find({ siteSelection, disabled: { $ne: true } });
  res.json(drivers);
}));

router.post('/', upload.any(), asyncHandler(async (req, res) => {
  const { Driver, Notification } = getModels(req);
  const driverData = req.body;

  // Parse JSON fields
  driverData.addedBy = parseJsonField(driverData, 'addedBy');
  driverData.vatDetails = parseJsonField(driverData, 'vatDetails');
  driverData.companyVatDetails = parseJsonField(driverData, 'companyVatDetails');
  if (driverData.typeOfDriver === 'Own Vehicle') {
    driverData.ownVehicleInsuranceNA = parseJsonField(driverData, 'ownVehicleInsuranceNA');
  }

  // Create empty arrays for standard documents
  const documentFields = [
    'profilePicture', 'insuranceDocument', 'drivingLicenseFrontImage',
    'drivingLicenseBackImage', 'passportDocument', 'ecsCard',
    'rightToWorkCard', 'signature', 'MotorVehicleInsuranceCertificate',
    'GoodsInTransitInsurance', 'PublicLiablity', 'companyRegistrationCertificate'
  ];

  const driverInitFields = {};
  documentFields.forEach(field => {
    driverInitFields[field] = [];
  });

  // Initialize driver document
  const newDriver = new Driver({
    ...driverData,
    ...driverInitFields,
    additionalDocs: {},  // initially as a plain object
    docTimeStamps: {},
  });

  // Temporary Map to hold additionalDocs during file processing
  const additionalDocsMap = new Map();

  req.files?.forEach((file) => {
    const isSmallEntry = ['profilePicture', 'signature'].includes(file.fieldname);
    const docEntry = createFileEntry(file, isSmallEntry);

    if (documentFields.includes(file.fieldname)) {
      newDriver[file.fieldname].push(docEntry);
    } else if (file.fieldname.match(/^extraDoc(\d+)_file(\d+)$/)) {
      const [, docIndex] = file.fieldname.match(/^extraDoc(\d+)_file(\d+)$/);
      const docLabel = req.body[`extraDoc${docIndex}_name`];
      if (docLabel) {
        const currentDocs = additionalDocsMap.get(docLabel) || [];
        currentDocs.push([docEntry]); // Assuming group structure
        additionalDocsMap.set(docLabel, currentDocs);
      }
    }
  });

  // Only set additionalDocs if any were uploaded
  if (additionalDocsMap.size > 0) {
    newDriver.additionalDocs = Object.fromEntries(additionalDocsMap);
  }

  // Save driver and notification
  const savedDriver = await newDriver.save();
  const notification = {
    driver: savedDriver._id,
    site: driverData.siteSelection,
    changed: 'drivers',
    message: `Driver ${driverData.firstName} ${driverData.lastName} has been newly added to ${driverData.siteSelection}`,
  };
  await new Notification({ notification, targetDevice: 'website' }).save();

  res.status(201).json(savedDriver);
}));

router.post('/upload-version', upload.any(), asyncHandler(async (req, res) => {
  const { Driver } = getModels(req);
  const { driverId, fieldName, approvedBy } = req.body;
  const file = req.files?.find((f) => f.fieldname === fieldName);

  if (!driverId || !fieldName || !file) {
    return res.status(400).json({ message: 'Missing required data' });
  }

  const driver = await Driver.findById(driverId);
  if (!driver) {
    return res.status(404).json({ message: 'Driver not found' });
  }

  const newVersion = createFileEntry(file);
  newVersion.approvedBy = parseJsonField({ approvedBy }, 'approvedBy') || '';

  if (!Array.isArray(driver[fieldName])) {
    driver[fieldName] = [];
  }
  driver[fieldName].push(newVersion);

  await driver.save();
  res.status(200).json({ message: 'New document version uploaded successfully', version: newVersion });
}));

router.post('/upload-additional-version', upload.any(), asyncHandler(async (req, res) => {
  const { Driver } = getModels(req);
  const { driverId, docLabel, fileGroupIndex } = req.body;
  const file = req.files?.[0];

  if (!driverId || !docLabel || fileGroupIndex === undefined || !file) {
    return res.status(400).json({ message: 'Missing required data' });
  }

  const driver = await Driver.findById(driverId);
  if (!driver) {
    return res.status(404).json({ message: 'Driver not found' });
  }

  const newVersion = createFileEntry(file);
  const docGroups = driver.additionalDocs.get(docLabel) || [];
  const groupIndex = parseInt(fileGroupIndex);

  if (!Array.isArray(docGroups[groupIndex])) {
    docGroups[groupIndex] = [];
  }
  docGroups[groupIndex].push(newVersion);
  driver.additionalDocs.set(docLabel, docGroups);

  await driver.save();
  res.status(200).json({ message: 'Version uploaded successfully', version: newVersion });
}));

router.post('/delete-version', asyncHandler(async (req, res) => {
  const { Driver } = getModels(req);
  const { driverId, fieldName, versionIndex } = req.body;

  if (!driverId || !fieldName || versionIndex === undefined) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const driver = await Driver.findById(driverId);
  if (!driver) {
    return res.status(404).json({ success: false, message: 'Driver not found' });
  }

  const versions = driver[fieldName];
  if (!Array.isArray(versions) || !versions[versionIndex]) {
    return res.status(400).json({ success: false, message: 'Invalid version index' });
  }

  versions.splice(versionIndex, 1);
  await driver.save();
  res.json({ success: true, message: 'Version deleted successfully' });
}));

router.post('/delete-additional-version', asyncHandler(async (req, res) => {
  const { Driver } = getModels(req);
  const { driverId, docLabel, fileGroupIndex, versionIndex } = req.body;

  if (!driverId || !docLabel || fileGroupIndex === undefined || versionIndex === undefined) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }

  const driver = await Driver.findById(driverId);
  if (!driver) {
    return res.status(404).json({ success: false, message: 'Driver not found' });
  }

  const docGroups = driver.additionalDocs.get(docLabel) || [];
  if (!Array.isArray(docGroups[fileGroupIndex]) || !docGroups[fileGroupIndex][versionIndex]) {
    return res.status(400).json({ success: false, message: 'Invalid group/version index' });
  }

  docGroups[fileGroupIndex].splice(versionIndex, 1);
  if (docGroups[fileGroupIndex].length === 0) {
    docGroups.splice(fileGroupIndex, 1);
  }
  driver.additionalDocs.set(docLabel, docGroups);

  await driver.save();
  res.json({ success: true, message: 'Version deleted successfully' });
}));

router.put('/newupdate/:id', upload.any(), asyncHandler(async (req, res) => {
  const { Driver, Notification, User } = getModels(req);
  const driver = await Driver.findById(req.params.id);
  if (!driver) {
    return res.status(404).json({ message: 'Driver not found' });
  }

  const driverData = req.body;
  if (driverData.addedBy)
    driverData.addedBy = parseJsonField(driverData, 'addedBy');
  if (driverData.vatDetails)
    driverData.vatDetails = parseJsonField(driverData, 'vatDetails');
  if (driverData.companyVatDetails)
    driverData.companyVatDetails = parseJsonField(driverData, 'companyVatDetails');
  if (driverData.typeOfDriver === 'Own Vehicle') {
    driverData.ownVehicleInsuranceNA = parseJsonField(driverData, 'ownVehicleInsuranceNA');
  }
  if (driverData.customTypeOfDriver) {
    driverData.customTypeOfDriver = parseJsonField(driverData, 'customTypeOfDriver');
  }
  driverData.typeOfDriverTrace = parseJsonField(driverData, 'typeOfDriverTrace');

  const updateFields = {
    firstName: driverData.firstName,
    lastName: driverData.lastName,
    address: driverData.address,
    postcode: driverData.postcode,
    nationalInsuranceNumber: driverData.nationalInsuranceNumber,
    dateOfBirth: driverData.dateOfBirth,
    nationality: driverData.nationality,
    dateOfJoining: driverData.dateOfJoining,
    transportId: driverData.transportId,
    transporterName: driverData.transporterName,
    utrNo: driverData.utrNo,
    utrUpdatedOn: driverData.utrUpdatedOn,
    vatDetails: driverData.vatDetails,
    typeOfDriver: driverData.typeOfDriver,
    typeOfDriverTrace: driverData.typeOfDriverTrace,
    customTypeOfDriver: driverData.customTypeOfDriver,
    vehicleSize: driverData.vehicleSize,
    Email: driverData.Email,
    PhoneNo: driverData.PhoneNo,
    bankName: driverData.bankName,
    sortCode: driverData.sortCode,
    bankAccountNumber: driverData.bankAccountNumber,
    accountName: driverData.accountName,
    bankNameCompany: driverData.bankNameCompany,
    sortCodeCompany: driverData.sortCodeCompany,
    bankAccountNumberCompany: driverData.bankAccountNumberCompany,
    accountNameCompany: driverData.accountNameCompany,
    bankChoice: driverData.bankChoice,
    companyUtrNo: driverData.companyUtrNo,
    companyRegNo: driverData.companyRegNo,
    employmentStatus: driverData.employmentStatus,
    drivingLicenseNumber: driverData.drivingLicenseNumber,
    dlValidity: driverData.dlValidity,
    dlExpiry: driverData.dlExpiry,
    issueDrivingLicense: driverData.issueDrivingLicense,
    activeStatus: driverData.activeStatus,
    suspended: driverData.suspended,
    expiredReasons: driverData.expiredReasons,
    addedBy: driverData.addedBy,
    insuranceProvider: driverData.insuranceProvider,
    policyNumber: driverData.policyNumber,
    policyStartDate: driverData.policyStartDate,
    policyEndDate: driverData.policyEndDate,
    companyName: driverData.companyName,
    companyRegAddress: driverData.companyRegAddress,
    insuranceProviderG: driverData.insuranceProviderG,
    policyNumberG: driverData.policyNumberG,
    policyStartDateG: driverData.policyStartDateG,
    policyEndDateG: driverData.policyEndDateG,
    insuranceProviderP: driverData.insuranceProviderP,
    policyNumberP: driverData.policyNumberP,
    policyStartDateP: driverData.policyStartDateP,
    policyEndDateP: driverData.policyEndDateP,
    passportIssuedFrom: driverData.passportIssuedFrom,
    passportNumber: driverData.passportNumber,
    passportValidity: driverData.passportValidity,
    passportExpiry: driverData.passportExpiry,
    rightToWorkValidity: driverData.rightToWorkValidity,
    rightToWorkExpiry: driverData.rightToWorkExpiry,
    siteSelection: driverData.siteSelection,
    ecsInformation: driverData.ecsInformation,
    ecsValidity: driverData.ecsValidity,
    ecsExpiry: driverData.ecsExpiry,
    delReqStatus: driverData.delReqStatus,
    companyRegExpiryDate: driverData.companyRegExpiryDate,
    ownVehicleInsuranceNA: driverData.ownVehicleInsuranceNA,
    vehicleRegPlate: driverData.vehicleRegPlate,
    disabled: driverData.disabled,
    disabledOn: driverData.disabledOn
  };

  if (req.files?.length > 0) {
    // Convert existing additionalDocs object to Map
    // if (driver.additionalDocs)
    //   updateFields.additionalDocs = new Map(Object.entries(driver.additionalDocs || {}));

    req.files.forEach((file) => {
      const isSmallEntry = ['profilePicture', 'signature'].includes(file.fieldname);
      const docEntry = createFileEntry(file, isSmallEntry);

      const standardFields = [
        'profilePicture', 'signature', 'insuranceDocument',
        'drivingLicenseFrontImage', 'drivingLicenseBackImage',
        'passportDocument', 'ecsCard', 'rightToWorkCard',
        'MotorVehicleInsuranceCertificate', 'GoodsInTransitInsurance',
        'PublicLiablity', 'companyRegistrationCertificate'
      ];

      if (standardFields.includes(file.fieldname)) {
        updateFields[file.fieldname] = updateFields[file.fieldname] || driver[file.fieldname] || [];
        updateFields[file.fieldname].push(docEntry);
      } else if (file.fieldname.match(/^extraDoc(\d+)_file(\d+)$/)) {
        const [, docIndex] = file.fieldname.match(/^extraDoc(\d+)_file(\d+)$/);
        const docLabel = driverData[`extraDoc${docIndex}_name`];

        if (docLabel) {
          const currentGroups = updateFields.additionalDocs.get(docLabel) || [];
          currentGroups.push([docEntry]); // assuming each file is in its own group
          updateFields.additionalDocs.set(docLabel, currentGroups);
        }
      }
    });

    // Convert Map back to plain object for MongoDB update
    updateFields.additionalDocs = Object.fromEntries(updateFields.additionalDocs);
  }

  // Update the driver in the database
  const updatedDriver = await Driver.findByIdAndUpdate(
    req.params.id,
    { $set: updateFields },
    { new: true }
  );

  // Update associated user if basic details changed
  if (
    driver.Email !== updatedDriver.Email ||
    driver.firstName !== updatedDriver.firstName ||
    driver.lastName !== updatedDriver.lastName
  ) {
    await User.findOneAndUpdate(
      { user_ID: updatedDriver.user_ID },
      {
        firstName: updatedDriver.firstName,
        lastName: updatedDriver.lastName,
        email: updatedDriver.Email,
      }
    );
  }

  // Send notification if the siteSelection changed
  if (driver.siteSelection !== updatedDriver.siteSelection) {
    const notification = {
      driver: updatedDriver._id,
      site: [driver.siteSelection, updatedDriver.siteSelection],
      changed: 'drivers',
      message: `Driver ${updatedDriver.firstName} ${updatedDriver.lastName} was changed from site ${driver.siteSelection} to ${updatedDriver.siteSelection}`,
    };
    await new Notification({ notification, targetDevice: 'website' }).save();
  }

  // Notify connected clients
  sendToClients(req.db, { type: 'driverUpdated', driverId: updatedDriver._id });

  res.json(updatedDriver);
}));


router.put('/:id', asyncHandler(async (req, res) => {
  const { Driver, Notification, User } = getModels(req);
  const driver = await Driver.findById(req.params.id);
  if (!driver) {
    return res.status(404).json({ message: 'Driver not found' });
  }

  const updateFields = { ...req.body };
  updateFields.vatDetails = parseJsonField(req.body, 'vatDetails');
  updateFields.companyVatDetails = parseJsonField(req.body, 'companyVatDetails');
  if (req.body.typeOfDriver === 'Own Vehicle') {
    updateFields.ownVehicleInsuranceNA = parseJsonField(req.body, 'ownVehicleInsuranceNA');
  }

  const updatedDriver = await Driver.findByIdAndUpdate(req.params.id, { $set: updateFields }, { new: true });

  if (driver.Email !== updatedDriver.Email || driver.firstName !== updatedDriver.firstName || driver.lastName !== updatedDriver.lastName) {
    await User.findOneAndUpdate(
      { user_ID: updatedDriver.user_ID },
      { firstName: updatedDriver.firstName, lastName: updatedDriver.lastName, email: updatedDriver.Email }
    );
  }

  if (driver.siteSelection !== updatedDriver.siteSelection) {
    const notification = {
      driver: updatedDriver._id,
      site: [driver.siteSelection, updatedDriver.siteSelection],
      changed: 'drivers',
      message: `Driver ${updatedDriver.firstName} ${updatedDriver.lastName} was changed from site ${driver.siteSelection} to ${updatedDriver.siteSelection}`,
    };
    await new Notification({ notification, targetDevice: 'website' }).save();
  }

  sendToClients(req.db, { type: 'driverUpdated' });
  res.json(updatedDriver);
}));

router.put('/docUpdate/:id', asyncHandler(async (req, res) => {
  const { Driver } = getModels(req);
  const updatedDriver = await Driver.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
  if (!updatedDriver) {
    return res.status(404).json({ message: 'Driver not found' });
  }
  res.json(updatedDriver);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const { Driver, Notification, User } = getModels(req);
  const driver = await Driver.findById(req.params.id);
  if (!driver) {
    return res.status(404).json({ message: 'Driver not found' });
  }

  await User.deleteOne({ user_ID: driver.user_ID });
  const notification = {
    driver: driver._id,
    site: driver.siteSelection,
    changed: 'drivers',
    message: `Driver ${driver.firstName} ${driver.lastName} was deleted`,
  };
  await new Notification({ notification, targetDevice: 'website' }).save();

  await Driver.findByIdAndDelete(req.params.id);
  res.json({ message: 'Driver deleted' });
}));

router.post('/toggleDriver/:id', asyncHandler(async (req, res) => {
  const { email, disabled } = req.body;
  const { Driver, Notification } = getModels(req);
  const driver = await Driver.findById(req.params.id);

  if (!driver) {
    return res.status(404).json({ message: 'Driver not found' });
  }

  driver.disabled = disabled;
  await driver.save();

  const statusText = disabled ? 'disabled' : 'enabled';

  // Save notification
  const notification = {
    driver: driver._id,
    site: driver.siteSelection,
    changed: 'drivers',
    message: `Driver ${driver.firstName} ${driver.lastName} was ${statusText}`,
  };
  await new Notification({ notification, targetDevice: 'website' }).save();

  // Respond immediately
  res.status(200).json({
    message: `Driver ${statusText}${disabled ? ' and email will be sent shortly' : ''} successfully`,
    disabledDriver: driver
  });

  // Send email in background if disabled
  if (disabled) {
    (async () => {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.MAILER_EMAIL,
            pass: process.env.MAILER_APP_PASSWORD,
          },
        });

        const mailOptions = {
          from: process.env.MAILER_EMAIL,
          to: email,
          cc: 'fleet@rainaltd.com',
          subject: 'Vehicle Return - Off Hire',
          html: `
            <div>
              <p>Dear Independent Contractor,</p>
              <p>Please accept this communication to inform you that the vehicle hired by you has been returned to us. To complete the Off-Hire process, our Fleet Team will now carry out a thorough inspection of the vehicle.</p>
              <p>If any new damages or issues are identified during the inspection, you will receive a detailed email containing:</p>
              <ul>
                <li>On-Hire photographs</li>
                <li>Off-Hire photographs</li>
                <li>Supporting photographs of any damages (if applicable)</li>
                <li>An estimate or invoice for any necessary repairs</li>
                <li>If no further issues are found, no additional communication will be required.</li>
              </ul>
              <p>Regarding Final Payment:<br>
              If applicable, your final payment will be processed once the off-hire inspection is complete within 30 days and all matters (including potential damage costs) are settled. If you do not receive payment, and no response has been provided within 30 days, please contact us at admin@rainaltd.com.</p>
              <p>Thank you for your cooperation. Should you have any questions or require further assistance, please email admin@rainaltd.com.</p>
              <p>Best regards,<br>Raina Ltd</p>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email sent to ${email}`);
      } catch (err) {
        console.error(`Failed to send email to ${email}:`, err);
      }
    })();
  }
}));




module.exports = router;