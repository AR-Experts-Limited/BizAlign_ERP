// utils/monitorChanges.js
const mongoose = require('mongoose');
const { sendToClients } = require('./sseService');

// Import schemas
const DayInvoiceSchema = require('../models/DayInvoice').schema;
const NotificationSchema = require('../models/notifications').schema;
const DriverSchema = require('../models/Driver').schema;

const activeStreams = new Map();

async function initializeChangeStreams(connection) {
    if (!connection || activeStreams.has(connection.name)) return;
  
    const streams = {
      deductions: null,
      installments: null,
      drivers: null,
      notifications: null
    };
  
    try {
      // Ensure collections exist
      const collections = await connection.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
  
      if (!collectionNames.includes('deductions')) {
        await connection.createCollection('deductions');
      }
      if (!collectionNames.includes('installments')) {
        await connection.createCollection('installments');
      }
      if (!collectionNames.includes('drivers')) {
        await connection.createCollection('drivers');
      }
      if (!collectionNames.includes('notifications')) {
        await connection.createCollection('notifications');
      }
  
      // Deductions Change Stream
      streams.deductions = connection.collection('deductions').watch([], { fullDocument: 'updateLookup' });
      streams.deductions.on('change', (change) => 
        handleDeductionChange(change, connection));
  
      // Installments Change Stream
      streams.installments = connection.collection('installments').watch([], { fullDocument: 'updateLookup' });
      streams.installments.on('change', (change) => 
        handleInstallmentChange(change, connection));
  
      // Drivers Change Stream
      streams.drivers = connection.collection('drivers').watch([], { fullDocument: 'updateLookup' });
      streams.drivers.on('change', (change) => 
        handleDriverChange(change, connection));
  
      // Notifications Change Stream
      streams.notifications = connection.collection('notifications').watch([], { fullDocument: 'updateLookup' });
      streams.notifications.on('change', (change) => 
        handleNotificationChange(change, connection));
  
      // Store streams and connection
      activeStreams.set(connection.name, {
        connection,
        streams,
        models: {
          DayInvoice: connection.model('DayInvoice', DayInvoiceSchema),
          Notification: connection.model('Notification', NotificationSchema),
          Driver: connection.model('Driver', DriverSchema)
        }
      });
  
      // Cleanup on connection close
      connection.on('close', () => {
        cleanupConnection(connection.name);
      });
  
    } catch (error) {
      console.error(`[${connection.name}] Error initializing change streams:`, error);
    }
  }

function cleanupConnection(dbName) {
  if (activeStreams.has(dbName)) {
    const { streams } = activeStreams.get(dbName);
    Object.values(streams).forEach(stream => stream.close());
    activeStreams.delete(dbName);
    console.log(`Cleaned up streams for ${dbName}`);
  }
}

// Deduction Change Handler
async function handleDeductionChange(change, connection) {
  const { DayInvoice, Notification, Driver } = activeStreams.get(connection.name).models;

  try {
    console.log(`[${connection.name}] Deduction change:`, change.operationType);

    if (change.operationType === 'update') {
      const updatedFields = change.updateDescription.updatedFields;
      
      if (updatedFields.signed !== undefined) {
        const deductionId = change.fullDocument._id.toString();
        const driverId = change.fullDocument.driverId;
        const date = change.fullDocument.date;
        const deductionDocument = change.fullDocument.deductionDocument;
        const newSignedValue = updatedFields.signed;

        const driverDetails = await Driver.findOne({ _id: driverId });
        
        await DayInvoice.updateMany(
          { driverId, date, 'deductionDetail._id': deductionId },
          { $set: { 
            'deductionDetail.$.signed': newSignedValue,
            'deductionDetail.$.deductionDocument': deductionDocument 
          }}
        );

        const notification = {
          id: String(deductionId).slice(-4),
          driverId: driverDetails._id,
          site: driverDetails.siteSelection,
          changed: 'deductions',
          message: `Document signed and Uploaded by ${change.fullDocument.driverName}`
        };
        
        await new Notification({ notification, targetDevice: 'website' }).save();
      }
    }
  } catch (error) {
    console.error(`[${connection.name}] Deduction handler error:`, error);
  }
}

// Installment Change Handler
async function handleInstallmentChange(change, connection) {
  const { DayInvoice, Notification, Driver } = activeStreams.get(connection.name).models;

  try {
    console.log(`[${connection.name}] Installment change:`, change.operationType);

    if (change.operationType === 'update') {
      const updatedFields = change.updateDescription.updatedFields;

      if (updatedFields.signed !== undefined) {
        const installmentId = change.fullDocument._id.toString();
        const driverId = change.fullDocument.driverId;
        const installmentDocument = change.fullDocument.installmentDocument;
        const newSignedValue = updatedFields.signed;

        const driverDetails = await Driver.findOne({ _id: driverId });

        await DayInvoice.updateMany(
          { driverId, 'installmentDetail._id': installmentId },
          { $set: { 
            'installmentDetail.$.signed': newSignedValue,
            'installmentDetail.$.installmentDocument': installmentDocument 
          }}
        );

        const notification = {
          id: String(installmentId).slice(-4),
          driverId: driverDetails._id,
          site: driverDetails.siteSelection,
          changed: 'installments',
          message: `Document signed and Uploaded by ${change.fullDocument.driverName}`
        };
        
        await new Notification({ notification, targetDevice: 'website' }).save();
      }
    }
  } catch (error) {
    console.error(`[${connection.name}] Installment handler error:`, error);
  }
}

// Driver Change Handler
async function handleDriverChange(change, connection) {
  const { Notification } = activeStreams.get(connection.name).models;

  try {
    console.log(`[${connection.name}] Driver change:`, change.operationType);

    if (change.operationType === 'update') {
      const updatedFields = change.updateDescription.updatedFields;
      const driver = change.fullDocument;

      const fieldsToMonitor = [
        'passportDocument',
        'insuranceDocument',
        'ecsCard'
      ];

      fieldsToMonitor.forEach(field => {
        if (updatedFields[field] !== undefined) {
          const message = `Driver ${driver.firstName} ${driver.lastName} has uploaded their ${field.replace('Document', '').replace('Card', '')} document`;
          new Notification({
            notification: {
              driver: driver._id,
              changed: 'driverDoc',
              message
            },
            targetDevice: 'website'
          }).save();
        }
      });
    }
  } catch (error) {
    console.error(`[${connection.name}] Driver handler error:`, error);
  }
}

// Notification Change Handler
async function handleNotificationChange(change, connection) {
  try {
    console.log(`[${connection.name}] Notification change:`, change.operationType);

    if (change.operationType === 'insert' || change.operationType === 'delete') {
      sendToClients(connection,{
        type: 'notificationUpdated',
      });
    }
  } catch (error) {
    console.error(`[${connection.name}] Notification handler error:`, error);
  }
}

module.exports = {
  initializeChangeStreams,
  cleanupConnection,
  handleDeductionChange,
  handleInstallmentChange,
  handleDriverChange,
  handleNotificationChange
};