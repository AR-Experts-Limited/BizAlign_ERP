const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const moment = require('moment-timezone');

// Import schemas instead of models
const DriverSchema = require('../models/Driver').schema;
const ScheduleSchema = require('../models/Schedule').schema;
const AuditLogSchema = require('../models/AuditLog').schema;
const AppDataSchema = require('../models/appdata').schema;

const UserSchema = require('../models/User').schema;

async function setArchiveDrivers(conn) {
    try {
        // Validate connection
        if (!conn || conn.readyState !== 1) {
            console.error(`[${conn?.name || 'unknown'}] Invalid or disconnected database connection`);
            return;
        }

        // Create connection-specific models
        //const Driver = conn.model('Driver', DriverSchema);
        //const Schedule = conn.model('Schedule', ScheduleSchema);

        const Driver = conn.models.Driver || conn.model('Driver', DriverSchema);
        const Schedule = conn.models.Schedule || conn.model('Schedule', ScheduleSchema);
        const AuditLog = conn.models.auditLog || conn.model('AuditLog', AuditLogSchema);

        const allDrivers = await Driver.find().select('_id');
        let driversToArchive = allDrivers.map(driver => driver._id);

        //const today = new Date();
        //const fiveDaysAgo = new Date(today);
        //fiveDaysAgo.setDate(today.getDate() - 5);

        // Get the "end of today" in London, converted to UTC for MongoDB comparison
        const today = moment().tz('Europe/London').endOf('day').utc().toDate();

        // Get "start of day" 5 days ago in London, converted to UTC
        const fiveDaysAgo = moment().tz('Europe/London').subtract(5, 'days').startOf('day').utc().toDate();

        const result = await Driver.aggregate([
            {
                $lookup: {
                    from: Schedule.collection.name,
                    let: { driverId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: [
                                        { $toObjectId: '$driverId' },
                                        '$$driverId'
                                    ]
                                },
                                day: { 
                                    $gte: fiveDaysAgo,
                                    $lt: today
                                },
                                service: { 
                                    $nin: ['unavailable', 'dayoff', 'Voluntary Day-Off']
                                }
                            }
                        }
                    ],
                    as: 'schedules'
                }
            },
            {
                $unwind: {
                    path: '$schedules',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $group: {
                    _id: '$_id',
                    createdAt: { $first: '$createdAt' },
                    schedules: { $push: '$schedules' },
                }
            }
        ]);      

        for (const driver of result) {
            if (driver.schedules.length > 0 || new Date(driver.createdAt) > fiveDaysAgo) {
                driversToArchive = driversToArchive.filter(item => 
                    item.toString() !== driver._id.toString()
                );
            }
        }

        if (driversToArchive.length > 0) {
            await Driver.updateMany(
                { _id: { $in: driversToArchive } },
                { $set: { activeStatus: 'Archived' } }
            );
            console.log("Archiving Drivers");
            const logUser = {
                firstName: "System",
                lastName: "Backend",
            }
            // Add Audit Log Entry here
            await AuditLog.create({
                message: `Archived ${driversToArchive.length} driver(s) in DB: ${conn.name}`,
                data: {
                    drivers: driversToArchive
                },
                logUser: {
                    firstName: "System",
                    lastName: "Backend"
                },
            });
            
        } else {
            //console.log(`[${conn.name}] No drivers to archive`);
        }

    } catch (err) {
        console.error(`[${conn.name}] Archive error:`, err);
    }
}

async function setInactiveDrivers(conn) {
    try {
        if (!conn || conn.readyState !== 1) {
            console.error(`[${conn?.name || 'unknown'}] Invalid or disconnected database connection`);
            return;
        }

        const Driver = conn.model('Driver', DriverSchema);
        const today = new Date();

        const expiredDrivers = await Driver.find({
            $or: [
                { dlExpiry: { $lt: today } },
                { passportExpiry: { $lt: today } },
                { rightToWorkExpiry: { $lt: today } }
            ]
        });

        if (expiredDrivers.length === 0) {
            return;
        }

        const bulkUpdates = expiredDrivers.map(driver => {
            const expiredReasons = [];
            if (driver.dlExpiry < today) expiredReasons.push("Driver's License");
            if (driver.passportExpiry < today) expiredReasons.push("Passport");
            if (driver.rightToWorkExpiry < today) expiredReasons.push("Right to Work");

            return {
                updateOne: {
                    filter: { _id: driver._id },
                    update: {
                        $set: { 
                            activeStatus: "Inactive", 
                            expiredReasons,
                            lastStatusChange: new Date()
                        }
                    }
                }
            };
        });

        await Driver.bulkWrite(bulkUpdates);

    } catch (err) {
        console.error(`[${conn.name}] Inactive error:`, err);
    }
}

async function suspendInactiveDrivers(conn) {
    try {
        if (!conn || conn.readyState !== 1) {
            console.error(`[${conn?.name || 'unknown'}] Invalid or disconnected database connection`);
            return;
        }

        const Driver = conn.model('Driver', DriverSchema);
        const Schedule = conn.model('Schedule', ScheduleSchema);
        const AuditLog = conn.model('AuditLog', AuditLogSchema);

        // Get yesterday's start and end in London timezone
        const moment = require('moment-timezone');
        const yesterdayStart = moment().tz('Europe/London').subtract(1, 'day').startOf('day').toDate();
        const yesterdayEnd = moment().tz('Europe/London').subtract(1, 'day').endOf('day').toDate();

        const inProgressSchedules = await Schedule.find({
            status: 'in_progress',
            day: { $gte: yesterdayStart, $lte: yesterdayEnd }
        });

        const suspendedDrivers = [];

        for (const schedule of inProgressSchedules) {
            const driver = await Driver.findById(schedule.driverId);
            if (driver && driver.suspended !== "Suspended") {
                await Driver.updateOne({ _id: driver._id }, { $set: { suspended: "Suspended" } });

                suspendedDrivers.push({
                    id: driver._id,
                    name: `${driver.firstName} ${driver.lastName}`,
                    user_ID: driver.user_ID
                });

                console.log(`✅ Suspended: ${driver.firstName}`);
            }
        }

        if (suspendedDrivers.length > 0) {
            await AuditLog.create({
                message: `Suspended ${suspendedDrivers.length} drivers (in_progress schedule from ${yesterdayStart.toISOString().slice(0,10)})`,
                data: { drivers: suspendedDrivers },
                logUser: { firstName: "System", lastName: "Backend" },
            });
        }

        return suspendedDrivers;

    } catch (err) {
        console.error(`[${conn?.name}] Suspension task error:`, err);
        throw err;
    }
}


  async function remindPendingShiftOSMs(conn) {
    if (!conn || conn.readyState !== 1) {
      console.error(`[${conn?.name || 'unknown'}] Invalid DB connection`);
      return;
    }
  
    const Schedule = conn.model('Schedule', ScheduleSchema);
    const User = conn.model('User', UserSchema);
    const Notification = conn.model('Notification', NotificationSchema);
  
    const todayStart = moment().tz('Europe/London').startOf('day').toDate();
    const todayEnd = moment().tz('Europe/London').endOf('day').toDate();
    
    console.log("✅ Checking for in_progress schedules...");

    const inProgressSchedules = await Schedule.find({
      status: 'in_progress',
      day: { $gte: todayStart, $lte: todayEnd }
    });
    
    console.log("📝 Found", inProgressSchedules.length, "schedules");

    const sitesWithInProgress = [...new Set(inProgressSchedules.map(s => s.site))];
    
    
    console.log("🛠 Affected sites:", sitesWithInProgress);

    // 🔁 Handle Sites WITH pending shifts
    for (const site of sitesWithInProgress) {
      const existing = await Notification.findOne({
        "notification.title": "Pending Shift Reminder",
        "notification.site": site,
        targetDevice: "website",
        "notification.sticky": true
      });
  
      if (!existing) {
        await Notification.create({
          notification: {
            title: "Pending Shift Reminder",
            message: "This is a reminder that there are Personnel yet to End their Shift for today. Please make a note and remind them.",
            site,
            sticky: true
          },
          targetDevice: "website"
        });
  
        console.log(`📌 Created sticky shift reminder for site: ${site}`);
      }
    }
  
    // ❌ Handle Sites WITHOUT in-progress shifts
    const allStickyNotifs = await Notification.find({
      "notification.title": "Pending Shift Reminder",
      "notification.sticky": true
    });
  
    for (const notif of allStickyNotifs) {
      const site = notif.notification.site;
      if (!sitesWithInProgress.includes(site)) {
        notif.notification.sticky = false;
        notif.markModified('notification');
        await notif.save();
        console.log(`🧹 Removed sticky reminder for site: ${site}`);
      }
    }
}

async function deleteDisabledDrivers(conn) {
  try {
    if (!conn || conn.readyState !== 1) {
      console.error(`[${conn?.name || 'unknown'}] Invalid or disconnected database connection`);
      return;
    }

    const Driver = conn.models.Driver || conn.model('Driver', DriverSchema);
    const User = conn.models.User || conn.model('User', UserSchema);

    // Calculate the cutoff date: today - 6 years and 1 day
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 6);
    cutoffDate.setDate(cutoffDate.getDate() - 1);

    const driversToDelete = await Driver.find({
      disabled: true,
      disabledOn: { $lte: cutoffDate },
    });

    if (driversToDelete.length === 0) {
      console.log(`[${conn.name}] No old disabled drivers found.`);
      return;
    }

    const userIDs = driversToDelete.map(d => d.user_ID).filter(Boolean);
    const driverIDs = driversToDelete.map(d => d._id);

    await Driver.deleteMany({ _id: { $in: driverIDs } });
    await User.deleteMany({ user_ID: { $in: userIDs } });

    console.log(`[${conn.name}] Deleted ${driverIDs.length} old disabled drivers and their users.`);
  } catch (err) {
    console.error(`[${conn.name}] Deletion error:`, err);
  }
}

  

module.exports = { setArchiveDrivers, setInactiveDrivers, suspendInactiveDrivers, remindPendingShiftOSMs, deleteDisabledDrivers };