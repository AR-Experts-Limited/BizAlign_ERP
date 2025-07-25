const express = require('express');
const router = express.Router();

// GET count of all unsigned documents for a specific user
router.get('/unsigned-documents/:user_ID', async (req, res) => {
    // Load models from the database connection provided by the middleware
    const Deduction = req.db.model('Deductions', require('../models/deductions').schema);
    const Installment = req.db.model('Installment', require('../models/installments').schema);
    const AdditionalCharges = req.db.model('AdditionalCharges', require('../models/additionalCharges').schema);

    try {
        const { user_ID } = req.params;

        if (!user_ID) {
            return res.status(400).json({ message: 'user_ID is required.' });
        }

        // Run all count queries in parallel for better performance
        const [
            unsignedDeductions,
            unsignedInstallments,
            unsignedAdditionalCharges
        ] = await Promise.all([
            Deduction.countDocuments({ user_ID, signed: false }),
            Installment.countDocuments({ user_ID, signed: false }),
            AdditionalCharges.countDocuments({ user_ID, signed: false })
        ]);

        res.status(200).json({
            unsignedDeductions,
            unsignedInstallments,
            unsignedAdditionalCharges,
        });
    } catch (error) {
        console.error('Error fetching unsigned documents:', error);
        res.status(500).json({ message: 'Error fetching unsigned documents', error });
    }
});

module.exports = router;

