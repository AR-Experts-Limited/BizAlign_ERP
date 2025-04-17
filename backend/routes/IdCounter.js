const express = require('express');
const router = express.Router();

// Get relevant ID Counter Entry
router.get('/:idType', async (req, res) => {
    const IdCounter = req.db.model('IdCounter', require('../models/IdCounter').schema);
    try {
    
      const idCounter = await IdCounter.find({idType: req.params.idType});
      res.status(200).json(idCounter);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching Counter Value!' });
    }
});

router.put('/:idType', async (req, res) => {
    const IdCounter = req.db.model('IdCounter', require('../models/IdCounter').schema);
    try {
        const idCounter = await IdCounter.updateOne(
            { idType: req.params.idType },
            { $inc: { counterValue: 1 } }
        );
        res.status(200).json(idCounter);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating Counter Value!' });
    }
});

module.exports = router;