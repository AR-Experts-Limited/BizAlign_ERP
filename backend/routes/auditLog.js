const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
    const AuditLog = req.db.model('AuditLog',require('../models/AuditLog').schema)

    const { message, logUser, data, timestamp } = req.body.params;
    try {
        const newLog = new AuditLog({ message, logUser, data });
        await newLog.save();
        res.status(201).json(newLog);
    }
    catch (error) {
        console.error("Error adding AuditLog:", error);
        res.status(500).json({ message: "Error adding AuditLog:", error: error.message });
    }
});

module.exports = router;