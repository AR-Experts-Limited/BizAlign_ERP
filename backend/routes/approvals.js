const express = require('express');
const router = express.Router();


router.get('/', async (req, res) => {
    const Approval = req.db.model('Approval', require('../models/Approvals').schema);
    try {
        const approval = await Approval.find().populate({
            path: 'reqData.dayInvoiceId',
            model: 'DayInvoice',
        }).sort({ createdAt: -1 });;
        res.json(approval);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching approvals', error });
    }
});

router.post('/', async (req, res) => {
    const Approval = req.db.model('Approval', require('../models/Approvals').schema);
    try {
        // Check if the approval type is additionalService
        if (req.body.type === 'additionalService') {
            const existingApproval = await Approval.findOne({
                type: 'additionalService',
                'reqData.dayInvoiceId': req.body.reqData.dayInvoiceId
            });

            // If an existing approval is found, delete it
            if (existingApproval) {
                await Approval.deleteOne({ _id: existingApproval._id });
            }
        }

        // Create and save the new approval
        const newApproval = new Approval(req.body);
        await newApproval.save();
        res.json(newApproval);
    } catch (error) {
        res.status(500).json({ message: 'Error processing approval', error });
    }
});

router.delete('/:id', async (req, res) => {
    const Approval = req.db.model('Approval', require('../models/Approvals').schema);
    const id = req.params.id
    try {
        await Approval.deleteOne({ _id: id })
        res.status(200).json({ message: 'approval cleared' })
    }
    catch (error) {
        res.status(500).json({ message: 'error clearing approval' })
    }
})

router.put('/', async (req, res) => {
    const Approval = req.db.model('Approval', require('../models/Approvals').schema);
    try {
        const updateApproval = await Approval.findByIdAndUpdate(req.body.id,
            { $set: { approvalStatus: req.body.approvalStatus, decisionTakenBy: req.body.decisionTakenBy } },
            { new: true }
        )
        res.status(201).json({ message: "approval updated", updateApproval });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message: "Error updating approval",
            error: error.message,
            stack: error.stack
        });
    }
})

module.exports = router;