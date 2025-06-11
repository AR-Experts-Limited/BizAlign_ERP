const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');


const getModels = (req) => ({
    WeeklyInvoice: req.db.model('WeeklyInvoice', require('../models/weeklyInvoice').schema),
    Installment: req.db.model('Installment', require('../models/installments').schema),
});

// GET route to retrieve weekly invoices
router.get('/', async (req, res) => {
    try {
        const { WeeklyInvoice } = getModels(req)
        const { driverIds, serviceWeeks, site } = req.query;

        // Build query object
        const query = {};
        if (driverIds && driverIds.length > 0) {
            query.driverId = { $in: driverIds.map(id => new mongoose.Types.ObjectId(id)) };
        }
        console.log(query.driverId)
        if (serviceWeeks) query.serviceWeek = { $in: serviceWeeks };
        if (site) query.site = site;

        // Fetch weekly invoices and populate the invoices field
        const weeklyInvoices = await WeeklyInvoice.find(query).populate('invoices').populate('installments').populate({ path: 'driverId', select: '_id user_ID firstName vatDetails companyVatDetails lastName Email typeOfDriver siteSelection' });

        if (!weeklyInvoices || weeklyInvoices.length === 0) {
            return res.status(404).json({ message: 'No weekly invoices found' });
        }

        res.status(200).json({ message: 'Weekly invoices retrieved successfully', data: weeklyInvoices });
    } catch (error) {
        console.error('Error retrieving weekly invoices:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;