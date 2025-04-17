const express = require('express');
const router = express.Router();

router.post('/login-time', async (req, res) => {
    const { userId, user } = req.body;

    // Ensure the SessionTime model is properly defined and imported
    const SessionTime = req.db.model('SessionTime', require('../models/SessionTime').schema);

    try {
        // Create a new instance of the SessionTime model
        const sessionTime = new SessionTime({
            userId,
            user,
            loginTime: new Date() // Use new Date() to get the current date and time
        });

        // Save the instance to the database
        await sessionTime.save();

        // Send a success response
        res.status(200).json({ message: 'Login time saved successfully' });
    } catch (error) {
        // Log the error for debugging
        console.error('Error saving login time:', error);

        // Send an error response
        res.status(500).json({ message: 'Error saving login time', error: error.message });
    }
});

router.post('/logout-time', async (req, res) => {
    const { userId } = req.body;

    // Ensure the SessionTime model is properly defined and imported
    const SessionTime = req.db.model('SessionTime', require('../models/SessionTime').schema);

    try {
        // Find the most recent login record for the user
        const session = await SessionTime.findOne({ userId }).sort({ loginTime: -1 });

        if (!session) {
            return res.status(404).json({ message: 'No login record found for the user' });
        }

        // Get the current time as logout time
        const logoutTime = new Date();

        // Calculate the session duration in milliseconds
        const sessionDurationMs = logoutTime - session.loginTime;

        // Convert duration from milliseconds to hours and minutes
        const sessionDuration = msToHoursAndMinutes(sessionDurationMs);

        // Update the session record with logout time and session duration
        session.logoutTime = logoutTime;
        session.sessionDuration = sessionDuration + ' on ' + logoutTime.toLocaleDateString(); // Save duration in "X hours Y minutes" format

        // Save the updated session record
        await session.save();

        // Send a success response
        res.status(200).json({
            message: 'Logout time saved successfully',
            logoutTime,
            sessionDuration, // Duration in "X hours Y minutes" format
        });
    } catch (error) {
        // Log the error for debugging
        console.error('Error saving logout time:', error);

        // Send an error response
        res.status(500).json({ message: 'Error saving logout time', error: error.message });
    }
});

// Helper function to convert milliseconds to hours and minutes
function msToHoursAndMinutes(durationMs) {
    const hours = Math.floor(durationMs / (1000 * 60 * 60)); // Convert to hours
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60)); // Remaining minutes

    return `${hours} hours ${minutes} minutes`;
}

module.exports = router;