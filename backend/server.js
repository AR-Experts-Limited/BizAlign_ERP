const express = require('express');
const mongoose = require('mongoose');
// const bcrypt = require('bcrypt');
// const User = require('./models/User');
const fs = require("fs");
const path = require("path");
require('dotenv').config();
const app = express();
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const driversRoutes = require('./routes/drivers');
const rateCardRoutes = require('./routes/rateCard');
const fleetRoutes = require('./routes/fleet');
const scheduleRoutes = require('./routes/Schedule');
const deductionRoutes = require('./routes/deductions');
const standbydriverRoutes = require('./routes/StandbyDriver');
const dayInvoiceRoutes = require('./routes/dayInvoice');
const weeklyInvoiceRoutes = require('./routes/weeklyInvoice');
const installmentsRoutes = require('./routes/installments');
const serviceRoutes = require('./routes/services');
const incentiveRoutes = require('./routes/incentives');
const profitLossRoutes = require('./routes/profitloss');
const idCounterRoutes = require('./routes/IdCounter');
const appDataRoutes = require('./routes/appdata');
const driverAvailabilityRoutes = require('./routes/driveravailability');
const notificationRoutes = require('./routes/notifications');
const appLocationRoutes = require('./routes/appLocationRoutes');
const additionalChargesRoutes = require('./routes/additionalCharges')
const auditLogRoutes = require('./routes/auditLog');
const applicationSettingsRoutes = require('./routes/applicationSettings');
const sitesRoutes = require('./routes/site');
const companyIncentiveRoutes = require('./routes/companyIncentives');
const sessionTimeRoutes = require('./routes/sessionTime')
const approvalsRoutes = require('./routes/approvals')
const { registerClient } = require('./utils/sseService');
const overdueDrivers = require('./routes/overdueDrivers');
const appVersionRoutes = require('./routes/applicationVersion');


const appNotifications = require('./routes/applicationNotifications'); // App
const appdriversRoutes = require('./routes/applicationDrivers');//App
const appScheduleRoutes = require('./routes/applicationSchedule');//App
const appDeductionRoutes = require('./routes/applicationDeductions');//App
const appInstallmentsRoutes = require('./routes/applicationInstallments');//App
const appAdditionalChargesRoutes = require('./routes/applicationAdditionalCharges');//App
const appAvailabilityRoutes = require('./routes/applicationAvailability');//App
const appAuth = require('./routes/applicationAuth');//App
const applicationLocationRoutes = require('./routes/applicationLocationRoutes');//App
const appUnsignedDocs = require('./middleware/applicationcombinedUnsignedDocuments');//App
const applicationDataRoutes = require('./routes/applicationData');//App

const dbMiddleware = require("./middleware/dbMiddleware");

const testRoutes = require('./routes/test');

const Driver = require('./models/Driver');
const Notification = require('./models/notifications')
const multer = require('multer');
const multerS3 = require('multer-s3');
const s3 = require('./routes/aws');
const { monitorDeductionChanges, monitorInstallmentChanges, monitorDriverDocChanges, monitorNotificationChanges } = require('./utils/monitorChanges');
const cron = require('node-cron');
const { setArchiveDrivers, setInactiveDrivers, suspendInactiveDrivers } = require('./utils/scheduledTasks');

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
      const user_ID = req.body.user_ID;
      cb(null, `${user_ID}/${file.fieldname}/${getFormattedDateTime()}/${file.originalname}`);
    },
  }),
});

app.use(dbMiddleware);

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://10.122.195.152:5173', 'https://erp-rainaltd.bizalign.co.uk', 'https://app.bizalign.co.uk'],  // Change this to allow requests from your frontend
  credentials: true,
}));

// app.use(cors({credentials: true}))

app.get('/api/stream', (req, res) => {
  registerClient(req, res);  // Register this client to listen for events
});

app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname, "public")));


app.use('/api/appDrivers', appdriversRoutes);//App
app.use('/api/appSchedule', appScheduleRoutes);//App
app.use('/api/appDeductions', appDeductionRoutes);//App
app.use('/api/appAvailability', appAvailabilityRoutes);//App
app.use('/api/applicationAuth', appAuth);//App
app.use('/api/applicationData', applicationDataRoutes);//App
app.use('/api/appNotifications', appNotifications);//AppWeb
app.use('/api/location', applicationLocationRoutes);//App
app.use('/api/appUnsignedDocs', appUnsignedDocs);//App
app.use('/api/appInstallments', appInstallmentsRoutes);//App
app.use('/api/appAdditionalCharges', appAdditionalChargesRoutes);//App
app.use('/api', appVersionRoutes);


// Use the auth routes
app.use('/api/auth', authRoutes);
app.use('/api/drivers', driversRoutes);
app.use('/api/drivers/count', driversRoutes);
app.use('/api/fleet', fleetRoutes);
app.use('/api/ratecards', rateCardRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/deductions', deductionRoutes);
app.use('/api/standbydriver', standbydriverRoutes);
app.use('/api/dayInvoice', dayInvoiceRoutes);
app.use('/api/weeklyInvoice', weeklyInvoiceRoutes);
app.use('/api/installments', installmentsRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/incentives', incentiveRoutes);
app.use('/api/profitloss', profitLossRoutes);
app.use('/api/idcounter', idCounterRoutes);
app.use('/api/appdata', appDataRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/driveravailability', driverAvailabilityRoutes);
app.use('/api/addons', additionalChargesRoutes);
app.use('/api/applocation', appLocationRoutes);
app.use('/api/auditlog', auditLogRoutes);
app.use('/api/applicationSettings', applicationSettingsRoutes);
app.use('/api/sites', sitesRoutes);
app.use('/api/sessionTime', sessionTimeRoutes);
app.use('/api/companyincentive', companyIncentiveRoutes);
app.use('/api/approvals', approvalsRoutes);
app.use('/api/overdue-drivers', overdueDrivers);

app.use('/api/test', testRoutes);



// Route for page1.html
app.get("/tnc", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "tnc.html"));
});

// // Users data
// const users = [
//   { email: 'superadmin@admin.com', password: '123456789', role: 'Super Admin' },
//   { email: 'admin@admin.com', password: '1234567', role: 'Admin' },
//   { email: 'osm@admin.com', password: '123456', role: 'On Site Manager' },
//   { email: 'driver@driver.com', password: '12345', role: 'Driver' },
// ];

// Seed function to create users
// async function seedUsers() {
//   for (let user of users) {
//     const hashedPassword = await bcrypt.hash(user.password, 10); // Hash the password
//     await User.create({ ...user, password: hashedPassword });
//   }
//   console.log('Users seeded successfully');
//   mongoose.connection.close();
// }

// seedUsers();
app.get("/api/app-store-badge", (req, res) => {
  res.sendFile(path.join(__dirname, "public/Download_on_the_App_Store_Badge.svg"));
});

app.use(express.static(path.join(__dirname, "../frontend/build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/build", "index.html"));
});

const port = process.env.PORT || 5700;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

