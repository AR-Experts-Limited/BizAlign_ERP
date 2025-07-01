const express = require('express');
const multer = require('multer');
const multerS3 = require('multer-s3');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
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
  Installment: req.db.model('Installment', require('../models/installments').schema),
  WeeklyInvoice: req.db.model('WeeklyInvoice', require('../models/weeklyInvoice').schema),
  DayInvoice: req.db.model('DayInvoice', require('../models/DayInvoice').schema),
  User: req.db.model('User', require('../models/User').schema),
  Notification: req.db.model('Notification', require('../models/notifications').schema),
  AdditionalCharges: req.db.model('AdditionalCharges', require('../models/additionalCharges').schema),
  RateCard: req.db.model('RateCard', require('../models/RateCard').schema),
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
  const drivers = await Driver.find().sort({ firstName: 1 });
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
  const { Driver, Notification, User } = getModels(req);
  const driverData = req.body;

  // Parse JSON fields
  driverData.addedBy = parseJsonField(driverData, 'addedBy');
  driverData.vatDetails = parseJsonField(driverData, 'vatDetails');
  driverData.companyVatDetails = parseJsonField(driverData, 'companyVatDetails');
  if (driverData.typeOfDriver === 'Own Vehicle') {
    driverData.ownVehicleInsuranceNA = parseJsonField(driverData, 'ownVehicleInsuranceNA');
  }
  driverData.customTypeOfDriver = parseJsonField(driverData, 'customTypeOfDriver');
  driverData.typeOfDriverTrace = parseJsonField(driverData, 'typeOfDriverTrace');

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

  // Generate user credentials
  const password = newDriver.Email.split('@')[0];
  const OTP = (Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000).toString();
  const otpExpiryDate = new Date();
  otpExpiryDate.setDate(otpExpiryDate.getDate() + 365);
  const driverAccess = [];
  const formattedUserID = newDriver.user_ID; // Assuming user_ID is provided in driverData

  // Hash the password
  const saltRounds = 10;
  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, saltRounds);
  } catch (error) {
    console.error('Error hashing password:', error);
    return res.status(500).json({ message: 'Error hashing password', error: error.message });
  }

  // Create driver user using User model
  try {
    const newUser = new User({
      firstName: newDriver.firstName,
      lastName: newDriver.lastName,
      email: newDriver.Email,
      password: hashedPassword,
      role: "Driver",
      companyId: driverData.companyId,
      access: driverAccess,
      otp: OTP,
      otpVerified: false,
      otpExpiry: otpExpiryDate,
      user_ID: formattedUserID
    });

    await newUser.save();

    // Save driver
    const savedDriver = await newDriver.save();

    // Create and save notification
    const notification = {
      driver: savedDriver._id,
      site: driverData.siteSelection,
      changed: 'drivers',
      message: `Driver ${driverData.firstName} ${driverData.lastName} has been newly added to ${driverData.siteSelection}`,
    };
    await new Notification({ notification, targetDevice: 'website' }).save();

    // Send welcome email
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
        to: newDriver.Email,
        subject: `Welcome to Raina Ltd, ${newDriver.firstName} ${newDriver.lastName}!`,
        html: `
          <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap" rel="stylesheet">
          <div style="font-family: Outfit,Arial, sans-serif; background-color: #f4f8ff; padding: 20px; border-radius: 10px; border: 2px solid #2a73cc;">
            <h2 style="color: #2a73cc; text-align: center;"> Welcome to Raina Ltd, ${newDriver.firstName} ${newDriver.lastName}! </h2>
            <p style="font-size: 16px; color: #333;">We are delighted to welcome you as a self-employed multi-drop delivery driver. Your commitment to providing excellent delivery services is greatly appreciated, and we want to ensure you have a smooth start with us.</p>
            <h3 style="color: #ff9900;">🔍 Understanding Our Working Relationship</h3>
            <p>You have read and signed our <strong>Service Level Agreement (SLA)</strong>, which clarifies that our partnership is based on service provision, not employment. Raina Ltd serves as your <strong>Supplier</strong>, not your Employer.</p>
            <h3 style="color: #ff9900;">Invoice & Payment Information</h3>
            <ul style="color: #333;">
              <li>Your invoices will be sent to this email and can be accessed via our application.</li>
              <li>Please provide your <strong>Unique Taxpayer Reference (UTR) number</strong> within 4 weeks if not already submitted.</li>
              <li>If operating as a <strong>limited company</strong>, kindly send us your company details and bank information for smooth payments.</li>
            </ul>
            <h3 style="color: #2a73cc;"> Introducing BizAlign – Your Driver App</h3>
            <p>To enhance your experience, we’ve introduced <strong>BizAlign</strong>, an ERP system designed to streamline administrative processes and improve efficiency.</p>
            <h3 style="color: #ff9900;">What You Need to Do</h3>
            <ul style="color: #333;">
              <li>Your login details are provided below. <strong>Save this email</strong> for future reference.</li>
              <li>Download the BizAlign app from the links below:</li>
            </ul>
            <p><strong>BizAlign Mobile Application:</strong></p>
            <p>
              <a href="https://apps.apple.com/us/app/bizalign-erp-system/id6742386791" target="_blank">
                <img src="https://erp-rainaltd.bizalign.co.uk/api/app-store-badge" 
                     alt="Download on the App Store" style="height: 40px">
              </a>
            </p>
            <p>
              <a href="https://play.google.com/store/apps/details?id=com.arexperts.bizalign&pcampaignid=web_share" target="_blank">
                <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" 
                     alt="Get it on Google Play" style="height: 60px;">
              </a>
            </p>
            <h3 style="color: #2a73cc;">Key Features of BizAlign</h3>
            <ul style="color: #333;">
              <li>✔ Track shifts & start/end procedures</li>
              <li>✔ Access self-billing invoices</li>
              <li>✔ View & manage deduction forms</li>
              <li>✔ Receive important notifications (keep them ON)</li>
              <li>✔ Upload & verify documents, sign forms digitally</li>
            </ul>
            <h3 style="color: #ff9900;">📌 Getting Started</h3>
            <p>Set up the app as soon as possible to ensure a seamless experience. Follow this video guide: <a href="https://youtu.be/PurUvKjuID0" style="color: #2a73cc; font-weight: bold;"><img src="https://upload.wikimedia.org/wikipedia/commons/4/42/YouTube_icon_%282013-2017%29.png" style="height:12px" /> Getting Started with BizAlign</a></p>
            <h3 style="color: #2a73cc;">🔑 Your Login Credentials</h3>
            <p><strong>Company ID:</strong> ${driverData.companyId}<br>
               <strong>Username:</strong> ${newDriver.Email}<br>
               <strong>Password:</strong> ${password}</p>
            <p><strong>One-Time Password (OTP):</strong> <span style="background-color: #ff9900; color: white; padding: 5px 10px; border-radius: 5px; font-weight: bold;">${OTP}</span></p>
            <p style="color: #555;">Thanks for your dedication, we’re excited to have you onboard!</p>
            <p style="font-weight: bold; color: #2a73cc;">Best regards,<br>Business Administrator<br>Raina Ltd</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      console.log(`Welcome email sent to ${newDriver.Email}`);
    } catch (err) {
      console.error(`Failed to send welcome email to ${newDriver.Email}:`, err);
    }

    res.status(201).json(savedDriver);
  } catch (error) {
    console.error('Error creating driver user:', error);
    res.status(500).json({ message: 'Error creating driver user', error: error.message });
  }
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


// Server-side implementation of getDriverTypeForDate from Rota.jsx
const getDriverTypeForDate = (driver, date) => {
  const dateKey = new Date(date).toLocaleDateString('en-UK');

  // 1. Custom override
  if (driver?.customTypeOfDriver?.[dateKey]) {
    return driver.customTypeOfDriver[dateKey];
  }

  const traces = driver?.typeOfDriverTrace || [];
  if (traces.length === 0) {
    return driver?.typeOfDriver;
  }

  const parseTraceDate = (ts) => {
    const [day, month, year] = ts.split('/');
    return new Date(`${year}-${month}-${day}`).setHours(0, 0, 0, 0);
  };

  const targetDate = new Date(date).setHours(0, 0, 0, 0);
  let latestTrace = null;

  for (const trace of traces) {
    const changeDate = parseTraceDate(trace.timestamp);
    if (changeDate <= targetDate) {
      if (!latestTrace || changeDate > parseTraceDate(latestTrace.timestamp)) {
        latestTrace = trace;
      }
    }
  }

  if (latestTrace) {
    return latestTrace.to;
  }

  const firstTrace = traces
    .slice()
    .sort((a, b) => parseTraceDate(a.timestamp) - parseTraceDate(b.timestamp))[0];

  if (firstTrace && targetDate < parseTraceDate(firstTrace.timestamp)) {
    return firstTrace.from;
  }

  return driver?.typeOfDriver;
};

// Helper function to find rate card (from Rota.jsx)
const rateCardFinder = async (RateCard, date, serviceWeek, service, driver) => {
  return await RateCard.findOne({
    serviceWeek,
    serviceTitle: service,
    vehicleType: getDriverTypeForDate(driver, date),
    active: true,
  });
};

const round2 = (num) => +parseFloat(num || 0).toFixed(2);


router.put('/newupdate/:id', upload.any(), asyncHandler(async (req, res) => {
  const { Driver, Notification, User, DayInvoice, WeeklyInvoice, AdditionalCharges, Installment, RateCard } = getModels(req);
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
    companyVatDetails: driverData.companyVatDetails,
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
          updateFields.additionalDocs = updateFields.additionalDocs || new Map(Object.entries(driver.additionalDocs || {}));
          const currentGroups = updateFields.additionalDocs.get(docLabel) || [];
          currentGroups.push([docEntry]);
          updateFields.additionalDocs.set(docLabel, currentGroups);
        }
      }
    });

    if (updateFields.additionalDocs) {
      updateFields.additionalDocs = Object.fromEntries(updateFields.additionalDocs);
    }
  }

  // Store original details for comparison
  const originalVatDetails = { ...(driver.vatDetails ?? {}) };
  const originalCompanyVatDetails = { ...(driver.companyVatDetails ?? {}) };
  const originalCustomTypeOfDriver = { ...(driver.customTypeOfDriver ?? {}) };
  const originalTypeOfDriverTrace = [...(driver.typeOfDriverTrace ?? [])];

  // Update the driver in the database
  const updatedDriver = await Driver.findByIdAndUpdate(
    req.params.id,
    { $set: updateFields },
    { new: true }
  );

  // Check if VAT details, company VAT details, customTypeOfDriver, or typeOfDriverTrace have changed
  const vatChanged =
    (originalVatDetails?.vatNo !== updatedDriver.vatDetails?.vatNo ||
      originalVatDetails?.vatEffectiveDate !== updatedDriver.vatDetails?.vatEffectiveDate) ||
    (originalCompanyVatDetails?.vatNo !== updatedDriver.companyVatDetails?.vatNo ||
      originalCompanyVatDetails?.companyVatEffectiveDate !== updatedDriver?.companyVatDetails?.companyVatEffectiveDate);

  const customTypeChanged = JSON.stringify(originalCustomTypeOfDriver) !== JSON.stringify(updatedDriver.customTypeOfDriver);
  const traceChanged = JSON.stringify(originalTypeOfDriverTrace) !== JSON.stringify(updatedDriver.typeOfDriverTrace);

  if (vatChanged || customTypeChanged || traceChanged) {
    // Determine the date range for affected invoices
    const vatDates = [
      originalVatDetails?.vatEffectiveDate ? new Date(originalVatDetails?.vatEffectiveDate) : null,
      updatedDriver?.vatDetails?.vatEffectiveDate ? new Date(updatedDriver?.vatDetails?.vatEffectiveDate) : null,
      originalCompanyVatDetails?.companyVatEffectiveDate ? new Date(originalCompanyVatDetails?.companyVatEffectiveDate) : null,
      updatedDriver?.companyVatDetails?.companyVatEffectiveDate ? new Date(updatedDriver.companyVatDetails.companyVatEffectiveDate) : null,
    ].filter(Boolean);

    const customTypeDates = [
      ...Object.keys(originalCustomTypeOfDriver || {}).map((d) => new Date(d.split('/').reverse().join('-'))),
      ...Object.keys(updatedDriver.customTypeOfDriver || {}).map((d) => new Date(d.split('/').reverse().join('-'))),
    ].filter(Boolean);

    const traceDates = [
      ...originalTypeOfDriverTrace.map((t) => {
        const [day, month, year] = t.timestamp.split('/');
        return new Date(`${year}-${month}-${day}`);
      }),
      ...updatedDriver.typeOfDriverTrace.map((t) => {
        const [day, month, year] = t.timestamp.split('/');
        return new Date(`${year}-${month}-${day}`);
      }),
    ].filter(Boolean);


    const allDates = [...vatDates, ...customTypeDates, ...traceDates];
    let dateFilter = {}
    if (allDates.length > 0) {
      const minDate = new Date(Math.min(...allDates.map(d => new Date(d))));
      const oneDayBeforeMin = new Date(minDate);
      oneDayBeforeMin.setDate(minDate.getDate() - 1);

      dateFilter = { date: { $gte: oneDayBeforeMin } };
      // Use dateFilter in your MongoDB query
    } else {
      dateFilter = {};
    }

    // Fetch affected DayInvoices
    const affectedDayInvoices = await DayInvoice.find({
      driverId: req.params.id,
      ...dateFilter,
    }).lean();



    // Group invoices by serviceWeek
    const invoicesByWeek = affectedDayInvoices.reduce((acc, invoice) => {
      const week = invoice.serviceWeek;
      if (!acc[week]) acc[week] = [];
      acc[week].push(invoice);
      return acc;
    }, {});

    // Process each service week
    for (const [serviceWeek, invoices] of Object.entries(invoicesByWeek)) {
      let weeklyBaseTotal = 0;
      let weeklyVatTotal = 0;

      // Check VAT applicability for invoices
      const isVatApplicable = (date) => {
        return (
          (updatedDriver.vatDetails?.vatNo && date >= new Date(updatedDriver.vatDetails.vatEffectiveDate)) ||
          (updatedDriver.companyVatDetails?.vatNo && date >= new Date(updatedDriver.companyVatDetails.companyVatEffectiveDate))
        );
      };

      // Update DayInvoices
      const updateForMain = [];
      const updateForAdditional = [];

      for (const invoice of invoices) {
        const invDate = new Date(invoice.date);
        const newVehicleType = getDriverTypeForDate(updatedDriver, invDate);

        // Update main service
        const mainRateCard = await rateCardFinder(RateCard, invDate, serviceWeek, invoice.mainService, updatedDriver);
        if (!mainRateCard) continue
        const oldIncentiveRate = round2(invoice.incentiveDetailforMain?.rate || 0);
        const oldDeductionTotal = invoice.deductionDetail?.reduce((sum, ded) => sum + round2(ded.rate), 0) || 0;
        const newIncentiveRate = round2(invoice.incentiveDetailforMain?.rate || 0);
        const newDeductionTotal = invoice.deductionDetail?.reduce((sum, ded) => sum + round2(ded.rate), 0) || 0;

        updateForMain.push({
          updateOne: {
            filter: { _id: invoice._id },
            update: {
              $set: {
                driverVehicleType: newVehicleType,
                serviceRateforMain: round2(mainRateCard?.serviceRate || 0),
                byodRate: round2(mainRateCard?.byodRate || 0),
                mileage: round2(mainRateCard?.mileage || 0),
                calculatedMileage: round2(invoice.miles * (mainRateCard?.mileage || 0)),
                total: round2(
                  invoice.total
                  - round2(invoice.serviceRateforMain)
                  - round2(invoice.byodRate)
                  - round2(invoice.calculatedMileage)
                  - oldIncentiveRate
                  + oldDeductionTotal
                  + round2(mainRateCard?.serviceRate || 0)
                  + round2(mainRateCard?.byodRate || 0)
                  + round2(invoice.miles * (mainRateCard?.mileage || 0))
                  + newIncentiveRate
                  - newDeductionTotal
                ),
              },
            },
          },
        });

        // Update additional service if applicable
        if (invoice.additionalServiceDetails?.service) {
          const additionalRateCard = await rateCardFinder(RateCard, invDate, serviceWeek, invoice.additionalServiceDetails.service, updatedDriver);
          if (!additionalRateCard) continue
          const oldAdditionalIncentiveRate = round2(invoice.incentiveDetailforAdditional?.rate || 0);

          updateForAdditional.push({
            updateOne: {
              filter: { _id: invoice._id },
              update: {
                $set: {
                  'additionalServiceDetails.serviceRate': round2(additionalRateCard?.serviceRate || 0),
                  'additionalServiceDetails.byodRate': round2(additionalRateCard?.byodRate || 0),
                  'additionalServiceDetails.mileage': round2(additionalRateCard?.mileage || 0),
                  'additionalServiceDetails.calculatedMileage': round2(invoice.additionalServiceDetails.miles * (additionalRateCard?.mileage || 0)),
                  serviceRateforAdditional: round2(
                    (additionalRateCard?.serviceRate || 0) +
                    (additionalRateCard?.byodRate || 0) +
                    (invoice.additionalServiceDetails.miles * (additionalRateCard?.mileage || 0)) +
                    (invoice.incentiveDetailforAdditional?.rate || 0)
                  ),
                  total: round2(
                    invoice.total
                    - round2(invoice.additionalServiceDetails.serviceRate || 0)
                    - round2(invoice.additionalServiceDetails.byodRate || 0)
                    - round2(invoice.additionalServiceDetails.calculatedMileage || 0)
                    - oldAdditionalIncentiveRate
                    + round2(additionalRateCard?.serviceRate || 0)
                    + round2(additionalRateCard?.byodRate || 0)
                    + round2(invoice.additionalServiceDetails.miles * (additionalRateCard?.mileage || 0))
                    + round2(invoice.incentiveDetailforAdditional?.rate || 0)
                  ),
                },
              },
            },
          });
        }

        const invBaseTotal = round2(
          (mainRateCard?.serviceRate || 0) +
          (mainRateCard?.byodRate || 0) +
          (invoice.miles * (mainRateCard?.mileage || 0)) +
          (invoice.incentiveDetailforMain?.rate || 0) -
          newDeductionTotal +
          (invoice.additionalServiceDetails?.service && invoice.additionalServiceApproval === 'Approved'
            ? (additionalRateCard?.serviceRate || 0) +
            (additionalRateCard?.byodRate || 0) +
            (invoice.additionalServiceDetails.miles * (additionalRateCard?.mileage || 0)) +
            (invoice.incentiveDetailforAdditional?.rate || 0)
            : 0)
        );

        weeklyBaseTotal += invBaseTotal;
        if (isVatApplicable(invDate)) {
          weeklyVatTotal += round2(invBaseTotal * 0.2);
        }
      }

      // Perform DayInvoice updates
      if (updateForMain.length > 0) {
        await DayInvoice.bulkWrite(updateForMain);
      }
      if (updateForAdditional.length > 0) {
        await DayInvoice.bulkWrite(updateForAdditional);
      }

      // Fetch AdditionalCharges for the service week
      const additionalCharges = await AdditionalCharges.find({ driverId: req.params.id, week: serviceWeek }).lean();
      let additionalChargesTotal = 0;
      for (const charge of additionalCharges) {
        let rateAdjustment = round2(charge.rate);
        if (charge.type === 'deduction') {
          rateAdjustment = -rateAdjustment;
        }
        additionalChargesTotal += rateAdjustment;
        const chargeDate = new Date(charge.week);
        if (isVatApplicable(chargeDate)) {
          weeklyVatTotal += round2(rateAdjustment * 0.2);
        }
      }

      weeklyBaseTotal = round2(weeklyBaseTotal + additionalChargesTotal);
      weeklyVatTotal = round2(weeklyVatTotal);
      const weeklyTotalBeforeInstallments = round2(weeklyBaseTotal + weeklyVatTotal);

      // Fetch the WeeklyInvoice for the service week
      const weeklyInvoice = await WeeklyInvoice.findOne({ driverId: req.params.id, serviceWeek }).lean();
      if (!weeklyInvoice) continue;

      // Restore previous installment deductions
      const allInstallments = await Installment.find({ driverId: req.params.id });
      for (const detail of weeklyInvoice.installmentDetail || []) {
        const inst = allInstallments.find((i) => i._id.toString() === detail._id?.toString());
        if (inst && detail.deductionAmount > 0) {
          inst.installmentPending = round2(inst.installmentPending + detail.deductionAmount);
          await inst.save();
        }
      }

      // Calculate new installment deductions
      const installmentMap = new Map();
      let remainingTotal = weeklyTotalBeforeInstallments;

      for (const inst of allInstallments) {
        const instId = inst._id.toString();
        if (inst.installmentPending <= 0) continue;

        const deduction = Math.min(
          round2(inst.spreadRate),
          round2(inst.installmentPending),
          remainingTotal
        );
        if (deduction <= 0) continue;

        inst.installmentPending = round2(inst.installmentPending - deduction);
        await inst.save();

        installmentMap.set(instId, {
          _id: inst._id,
          installmentRate: round2(inst.installmentRate),
          installmentType: inst.installmentType,
          installmentDocument: inst.installmentDocument,
          installmentPending: round2(inst.installmentPending),
          deductionAmount: round2(deduction),
          signed: inst.signed,
        });

        remainingTotal = round2(remainingTotal - deduction);
      }

      const mergedInstallments = Array.from(installmentMap.values());
      const totalInstallmentDeduction = round2(
        mergedInstallments.reduce((sum, inst) => sum + (inst.deductionAmount || 0), 0)
      );

      const finalWeeklyTotal = round2(Math.max(0, weeklyTotalBeforeInstallments - totalInstallmentDeduction));

      // Update WeeklyInvoice
      await WeeklyInvoice.updateOne(
        { driverId: req.params.id, serviceWeek },
        {
          $set: {
            vatTotal: weeklyVatTotal,
            total: finalWeeklyTotal,
            installmentDetail: mergedInstallments,
            installments: mergedInstallments.map((inst) => inst._id),
          },
        }
      );
    }
  }

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