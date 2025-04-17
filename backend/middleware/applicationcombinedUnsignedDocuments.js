const express = require('express');
const router = express.Router();
const Deduction = require('../models/deductions');
const Installment = require('../models/installments');

// GET count of all unsigned documents for a specific user
router.get('/unsigned-documents/:user_ID', async (req, res) => {
    const Deduction = req.db.model('Deduction',require('../models/deductions').schema);
    const Installment = req.db.model('Installment',require('../models/installments').schema);
    try {
        const { user_ID } = req.params;

        if (!user_ID) {
            return res.status(400).json({ message: 'user_ID is required.' });
        }

        const unsignedDeductions = await Deduction.find({ user_ID, signed: false }).countDocuments();
        const unsignedInstallments = await Installment.find({ user_ID, signed: false }).countDocuments();

        res.status(200).json({
            unsignedDeductions,
            unsignedInstallments,
        });
    } catch (error) {
        console.error('Error fetching unsigned documents:', error);
        res.status(500).json({ message: 'Error fetching unsigned documents', error });
    }
});

module.exports = router;
