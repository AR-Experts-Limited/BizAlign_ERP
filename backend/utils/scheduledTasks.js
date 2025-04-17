const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const moment = require('moment-timezone');

// Import schemas instead of models
const DriverSchema = require('../models/Driver').schema;
const ScheduleSchema = require('../models/Schedule').schema;
const AuditLogSchema = require('../models/AuditLog').schema;

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

module.exports = { setArchiveDrivers, setInactiveDrivers };