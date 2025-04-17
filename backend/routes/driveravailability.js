const express = require('express');
const router = express.Router();


router.get('/', async( req, res)=>{
    const DriverAvailability = req.db.model('DriverAvailability',require('../models/DriverAvailability').schema);
    const {user_ID} = req.query;
    try{
        const driverAvailability = await DriverAvailability.findOne({
            user_ID: user_ID,
          })
        res.status(200).json(driverAvailability)
    }
    catch(error){
        res.status(500).json({message:'error finding data from Driver Availability', error})
    }
})

module.exports = router;