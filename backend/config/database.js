const mongoose = require("mongoose");
const { initializeChangeStreams } = require('../utils/monitorChanges');
const cron = require('node-cron');
const { setArchiveDrivers, setInactiveDrivers, suspendInactiveDrivers, remindPendingShiftOSMs, deleteDisabledDrivers } = require('../utils/scheduledTasks');

const connections = {}; // Store connections

const dbUser = process.env.MONGODB_USER;
const dbPassword = encodeURIComponent(process.env.MONGODB_PASSWORD);
const dbCluster = process.env.MONGODB_CLUSTER;

const getDatabaseConnection = async (dbName) => {
    try{
        if (!connections[dbName]) 
        {
            const conn = mongoose.createConnection(`mongodb+srv://${dbUser}:${dbPassword}@${dbCluster}/${dbName}?retryWrites=true&w=majority&appName=${dbName}`, {
                useNewUrlParser: true,
                useUnifiedTopology: true
                                             })

                                             if (dbName !== 'ClientMapDB') {
                                                conn.on('connected', () => {
                                                    initializeChangeStreams(conn);
                                                    // Schedule daily at midnight
                                                    cron.schedule('0 0 * * *', () => {
                                                        setArchiveDrivers(conn);
                                                        setInactiveDrivers(conn);
                                                        suspendInactiveDrivers(conn);
                                                        deleteDisabledDrivers(conn);
                                                    },
                                                    {
                                                        timezone: 'Europe/London'
                                                    });
                                                });
                                            }    

            connections[dbName] = conn;
        }
        return connections[dbName];
    }
    catch(error){
        console.error('Error connecting to MongoDB', err)
    }
}

module.exports = { getDatabaseConnection };
