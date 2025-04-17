const express = require('express');
const router = express.Router();
const AppData = require('../models/appdata');


router.get('/', async( req, res)=>{

    const AppData = req.db.model('AppData', require('../models/appdata').schema);
    const {driverId, startDay, endDay} = req.query;
    try{
        const appData = await AppData.find({
            driverId: {$in:driverId},
            day:{
              $gte: new Date(startDay),
              $lte: new Date(endDay)
            }
          }).sort({ day: 1 })

        res.status(200).json(appData)

    }
    catch(error){
        res.status(500).json({message:'error finding data from app'})
    }
})

module.exports = router;