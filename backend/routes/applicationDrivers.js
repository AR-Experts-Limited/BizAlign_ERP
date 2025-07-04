const express = require('express');
const multer = require('multer'); // To handle file uploads
const router = express.Router();
const fs = require('fs');
const multerS3 = require('multer-s3');
const { uploadToS3 } = require('../utils/applications3Helper');



const storage = multer.memoryStorage();
const upload = multer({ storage });


// Get all drivers
router.get('/', async (req, res) => {
  const Driver = req.db.model('Driver', require('../models/Driver').schema);
  try {
    const drivers = await Driver.find();
    res.json(drivers);
  }
  catch (error) {
    res.status(500).json({ message: 'Error fetching drivers', error });
  }
});

router.get('/siteinfo', async (req, res) => {
  const Driver = req.db.model('Driver', require('../models/Driver').schema);
  const { driverId } = req.query
  try {
    const drivers = await Driver.findOne({ _id: driverId });
    res.json(drivers.siteSelection);
  }
  catch (error) {
    res.status(500).json({ message: "Error fetching driver's site", error });
  }
})

router.get('/driverbyid', async (req, res) => {
  const Driver = req.db.model('Driver', require('../models/Driver').schema);
  const { driverId } = req.query
  try {
    const drivers = await Driver.findOne({ _id: driverId });
    res.json(drivers);
  }
  catch (error) {
    res.status(500).json({ message: 'Error fetching drivers', error });
  }
})

router.get('/ninumber', async (req, res) => {
  const Driver = req.db.model('Driver', require('../models/Driver').schema);
  const { niNumber } = req.query;
  try {
    const drivers = await Driver.findOne({ nationalInsuranceNumber: niNumber });
    res.json(drivers);
  }
  catch (error) {
    res.status(500).json({ message: 'Error fetching drivers', error });
  }
})

//filter router for getting standbydrivers
router.get('/filter', async (req, res) => {
  const Driver = req.db.model('Driver', require('../models/Driver').schema);
  try {
    const drivers = await Driver.find({ _id: { $in: req.query.id }, siteSelection: { $ne: req.query.site } })
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching drivers', error });
  }
});

// GET: /api/drivers/count
router.get('/count', async (req, res) => {
  const Driver = req.db.model('Driver', require('../models/Driver').schema);
  try {
    const driverCount = await Driver.countDocuments();
    res.json({ driverCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch driver count' });
  }
});

// Get drivers with document expiry dates
router.get('/notifications', async (req, res) => {
  const Driver = req.db.model('Driver', require('../models/Driver').schema);
  try {
    const drivers = await Driver.find({}, 'transportId firstName lastName dlExpiry gtExpiry plExpiry hrExpiry ecsExpiry passportExpiry drExpiry rightToWorkExpiry passportDocument insuranceDocument drivingLicenseFrontImage drivingLicenseBackImage rightToWorkCard ecsCard expiredReasons approvedBy addedBy');
    res.json(drivers);
  } catch (error) {
    console.error('Error fetching drivers for notifications:', error);
    res.status(500).json({ message: 'Error fetching drivers' });
  }
});

// Get drivers for specific Site
router.get('/:siteSelection', async (req, res) => {
  const Driver = req.db.model('Driver', require('../models/Driver').schema);
  try {
    const { siteSelection } = req.params;

    // Find Drivers by site
    const drivers = await Driver.find({ siteSelection });
    res.json(drivers);
  } catch (error) {
    console.error('Error fetching Driver data:', error); // Improved logging
    res.status(500).json({ message: 'Error fetching Driver data', error });
  }
});

// Add a new driver with file upload
router.post('/', upload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'insuranceDocument', maxCount: 1 },
  { name: 'drivingLicenseFrontImage', maxCount: 1 },
  { name: 'drivingLicenseBackImage', maxCount: 1 },
  { name: 'passportDocument', maxCount: 1 },
  { name: 'ecsCard', maxCount: 1 },
  { name: 'rightToWorkCard', maxCount: 1 },
  { name: 'signature', maxCount: 1 }
]), async (req, res) => {
  const Driver = req.db.model('Driver', require('../models/Driver').schema);
  try {
    const {
      user_ID,
      firstName, lastName, address, postcode, nationalInsuranceNumber, dateOfBirth, nationality, dateOfJoining, transportId, utrNo, utrUpdatedOn, vatNo, typeOfDriver, Email, PhoneNo,
      bankName, sortCode, bankAccountNumber, accountName, bankNameCompany, sortCodeCompany, bankAccountNumberCompany, accountNameCompany, bankChoice,
      drivingLicenseNumber, dlValidity, dlExpiry, issueDrivingLicense,
      passportIssuedFrom, passportNumber, passportValidity, passportExpiry, rightToWorkValidity, rightToWorkExpiry, siteSelection, ecsInformation, ecsValidity, ecsExpiry,
    } = req.body;

    var { addedBy } = req.body;
    addedBy = JSON.parse(addedBy);

    // Set file fields, use empty string if missing
    const profilePicture = req.files?.profilePicture?.[0]?.location || '';
    const insuranceDocument = req.files?.insuranceDocument?.[0]?.location || '';
    const drivingLicenseFrontImage = req.files?.drivingLicenseFrontImage?.[0]?.location || '';
    const drivingLicenseBackImage = req.files?.drivingLicenseBackImage?.[0]?.location || '';
    const passportDocument = req.files?.passportDocument?.[0]?.location || '';
    const ecsCard = req.files?.ecsCard?.[0]?.location || '';
    const rightToWorkCard = req.files?.rightToWorkCard?.[0]?.location || '';
    const signature = req.files?.signature?.[0]?.location || '';

    //const idCounter = await IdCounter.find({idType: "Driver"});
    //const userID = idCounter.data.counterValue;
    //const formattedUserID = userID.toString().padStart(6, '0');
    //console.log("Manual ID = ", formattedUserID);

    // Save driver to database
    const newDriver = new Driver({
      user_ID,
      firstName, lastName, address, postcode, nationalInsuranceNumber, dateOfBirth, nationality, dateOfJoining, transportId, utrNo, utrUpdatedOn, vatNo, typeOfDriver, Email, PhoneNo,
      bankName, sortCode, bankAccountNumber, accountName, bankNameCompany, sortCodeCompany, bankAccountNumberCompany, accountNameCompany, bankChoice,
      drivingLicenseNumber, dlValidity, dlExpiry, issueDrivingLicense, activeStatus: 'Active', addedBy,
      passportIssuedFrom, passportNumber, passportValidity, passportExpiry, rightToWorkValidity, rightToWorkExpiry, siteSelection, ecsInformation, ecsValidity, ecsExpiry,
      profilePicture, insuranceDocument, drivingLicenseFrontImage, drivingLicenseBackImage, passportDocument, ecsCard, rightToWorkCard, signature
    });

    const newDriverData = await newDriver.save();
    res.status(201).json(newDriver);
  } catch (error) {
    console.error('Error adding driver from drivers.js:', error.message, error.stack); // Detailed error logging
    res.status(500).json({ message: 'Error adding driver from drivers.js', error: error.message });
  }
});



// Update driver details
router.put('/:id', async (req, res) => {
  const Driver = req.db.model('Driver', require('../models/Driver').schema);
  const Notification = req.db.model('Notification', require('../models/notifications').schema);

  const originalDriver = await Driver.findById(req.params.id);
  try {
    const {
      firstName, lastName, address, postcode, nationalInsuranceNumber, dateOfBirth, nationality, dateOfJoining, transportId, utrNo, utrUpdatedOn, vatNo, typeOfDriver, Email, PhoneNo,
      bankName, sortCode, bankAccountNumber, accountName, bankNameCompany, sortCodeCompany, bankAccountNumberCompany, accountNameCompany, bankChoice,
      drivingLicenseNumber, dlValidity, dlExpiry, issueDrivingLicense, activeStatus, expiredReasons, addedBy,
      passportIssuedFrom, passportNumber, passportValidity, passportExpiry, rightToWorkValidity, rightToWorkExpiry, siteSelection, ecsInformation, ecsValidity, ecsExpiry,
    } = req.body;

    const updatedDriver = await Driver.findByIdAndUpdate(
      req.params.id,
      {
        firstName, lastName, address, postcode, nationalInsuranceNumber, dateOfBirth, nationality, dateOfJoining, transportId, utrNo, utrUpdatedOn, vatNo, typeOfDriver, Email, PhoneNo,
        bankName, sortCode, bankAccountNumber, accountName, bankNameCompany, sortCodeCompany, bankAccountNumberCompany, accountNameCompany, bankChoice,
        drivingLicenseNumber, dlValidity, dlExpiry, issueDrivingLicense, activeStatus, expiredReasons, addedBy,
        passportIssuedFrom, passportNumber, passportValidity, passportExpiry, rightToWorkValidity, rightToWorkExpiry, siteSelection, ecsInformation, ecsValidity, ecsExpiry,
      },
      { new: true }
    );
    const updatedFields = {};

    if (originalDriver.siteSelection !== updatedDriver.siteSelection) {
      updatedFields.siteSelection = {
        before: originalDriver.siteSelection,
        after: updatedDriver.siteSelection
      };
      const notification = { driver: updatedDriver._id, site: [updatedFields.siteSelection.before, updatedFields.siteSelection.after], changed: 'drivers', message: `Driver ${firstName + ' ' + lastName} was changed from site ${updatedFields.siteSelection.before} to ${updatedFields.siteSelection.after} ` }
      const newNotification = new Notification({ notification, targetDevice: 'website' })
      await newNotification.save()
    }



    res.json(updatedDriver);
  } catch (error) {
    res.status(500).json({ message: 'Error updating driver', error });
  }
});

router.put('/docUpdate/:id', async (req, res) => {
  const Driver = req.db.model('Driver', require('../models/Driver').schema);
  try {
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
})

// Delete driver and optionally delete associated files
router.delete('/:id', async (req, res) => {
  const Driver = req.db.model('Driver', require('../models/Driver').schema);
  const Notification = req.db.model('Notification', require('../models/notifications').schema);
  try {
    const driver = await Driver.findById(req.params.id);

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    // Optionally delete files from the file system
    try {
      if (driver.profilePicture) fs.unlinkSync(driver.profilePicture);
      if (driver.insuranceDocument) fs.unlinkSync(driver.insuranceDocument);
      if (driver.drivingLicenseFrontImage) fs.unlinkSync(driver.drivingLicenseFrontImage);
      if (driver.drivingLicenseBackImage) fs.unlinkSync(driver.drivingLicenseBackImage);
      if (driver.passportDocument) fs.unlinkSync(driver.passportDocument);
      if (driver.ecsCard) fs.unlinkSync(driver.ecsCard);
      if (driver.rightToWorkCard) fs.unlinkSync(driver.rightToWorkCard);
      if (driver.signature) fs.unlinkSync(driver.signature);
    }
    catch (error) {
      console.error('Error deleting file:', error.message);
    }

    const notification = { driver: driver._id, site: driver.siteSelection, changed: 'drivers', message: `Driver ${driver.firstName + ' ' + driver.lastName} was deleted` }
    const newNotification = new Notification({ notification, targetDevice: 'website' })
    await newNotification.save()

    await Driver.findByIdAndDelete(req.params.id);
    res.json({ message: 'Driver deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting driver', error });
  }
});

router.get('/:siteSelection', async (req, res) => {
  const Driver = req.db.model('Driver', require('../models/Driver').schema);
  try {
    const siteSelection = req.params.siteSelection
    const drivers = await Driver.find({ siteSelection: siteSelection })
    res.json(drivers);
  }
  catch (error) {
    console.error('Error fetching drivers for notifications:', error);
    res.status(500).json({ message: 'Error fetching drivers' });
  }
}
)


//-------------------------------------------------------------------
// PATCH: Update driver documents for App
router.patch('/user/:user_ID/documents', upload.single('document'), async (req, res) => {
  const Driver = req.db.model('Driver', require('../models/Driver').schema);

  try {
    const { user_ID } = req.params;
    const { documentType, docLabel, fileGroupIndex } = req.body;

    if (!documentType || !req.file) {
      return res.status(400).json({ message: "Document type and file are required." });
    }

    const driver = await Driver.findOne({ user_ID });
    if (!driver) {
      return res.status(404).json({ message: "Driver not found." });
    }

    const uploadResult = await uploadToS3(
      req.db.db.databaseName,
      req.file,
      driver.user_ID,
      "driver-documents",
      documentType
    );

    if (!uploadResult || !uploadResult.url) {
      return res.status(500).json({ message: "Failed to upload document to S3." });
    }

    const timestamp = new Date();
    let newVersion;

    // If it's profilePicture
    if (documentType === "profilePicture") {
      newVersion = {
        original: uploadResult.url,
        timestamp
      };

      if (!Array.isArray(driver.profilePicture)) {
        driver.profilePicture = [];
      }
      driver.profilePicture.push(newVersion);
    }

    // If it's an additionalDoc (special)
    else if (documentType === "additionalDocs") {
      if (!docLabel || fileGroupIndex === undefined) {
        return res.status(400).json({ message: "docLabel and fileGroupIndex are required for additionalDocs." });
      }

      newVersion = {
        original: uploadResult.url,
        timestamp,
        approvedBy: ''
      };

      // Push into correct additionalDocs label and group
      if (!driver.additionalDocs.has(docLabel)) {
        driver.additionalDocs.set(docLabel, []);
      }
      const docGroups = driver.additionalDocs.get(docLabel);

      const groupIdx = parseInt(fileGroupIndex);
      if (!Array.isArray(docGroups[groupIdx])) {
        docGroups[groupIdx] = [];
      }
      docGroups[groupIdx].push(newVersion);

      driver.additionalDocs.set(docLabel, docGroups);
    }

    // If it's a normal document
    else {
      newVersion = {
        original: '',
        temp: uploadResult.url,
        docApproval: false,
        timestamp,
        approvedBy: ''
      };

      if (!Array.isArray(driver[documentType])) {
        driver[documentType] = [];
      }
      driver[documentType].push(newVersion);
    }

    await driver.save({ validateBeforeSave: false });

    res.status(200).json({ message: "Document uploaded successfully.", document: newVersion });

  } catch (error) {
    console.error("Error uploading document:", error);
    res.status(500).json({ message: "Server error while uploading document.", error: error.message });
  }
});


// Get driver by user_ID -App
router.get('/user/:user_ID', async (req, res) => {
  const Driver = req.db.model('Driver', require('../models/Driver').schema);
  const { user_ID } = req.params;

  try {
    const driver = await Driver.findOne({ user_ID });

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const driverObj = driver.toObject();

    // Correctly process latest profilePicture
    if (driverObj.profilePicture?.length > 0) {
      const sorted = [...driverObj.profilePicture].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      driverObj.profilePicture = sorted[0]?.original || null;
    } else {
      driverObj.profilePicture = null;
    }

    //console.log(driverObj.profilePicture);

    res.status(200).json(driverObj);

  } catch (error) {
    console.error('Error fetching driver by user_ID:', error);
    res.status(500).json({ message: 'Internal server error', error });
  }
});

// PATCH: Update driver documents for App
router.patch('/:id/documents', upload.single('document'), async (req, res) => {
  const Driver = req.db.model('Driver', require('../models/Driver').schema);
  try {
    const { id } = req.params;
    const { documentType } = req.body; // e.g., 'profilePicture', 'insuranceDocument', etc.

    if (!documentType || !req.file) {
      return res.status(400).json({ message: 'Document type and file are required.' });
    }

    // Fetch the driver to update
    const driver = await Driver.findById(id);
    if (!driver) return res.status(404).json({ message: 'Driver not found.' });

    // Upload the new document to S3
    const uploadResult = await uploadToS3(req.db.db.databaseName, req.file, driver.user_ID, 'driver-documents', documentType);

    // Update the document field dynamically
    driver[documentType] = uploadResult.url;
    await driver.save();

    res.status(200).json({ message: 'Document updated successfully.', url: uploadResult.url });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ message: 'Error updating document.', error });
  }
});


module.exports = router;


