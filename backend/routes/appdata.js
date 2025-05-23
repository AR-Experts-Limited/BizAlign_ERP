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

router.get('/fetch-start-miles', async (req, res) => {
  const { schedule_ID } = req.query;

  if (!schedule_ID) {
    return res.status(400).json({ message: 'Missing schedule_ID' });
  }

  try {
    const AppData = req.db.model('AppData', require('../models/appdata').schema);
    const data = await AppData.findOne({schedule_ID });

    if (data?.startShiftChecklist?.startMiles) {
      return res.status(200).json({ startMiles: data.startShiftChecklist.startMiles });
    } else {
      return res.status(404).json({ message: 'Start miles not found' });
    }
  } catch (error) {
    console.error("DB Fetch Error:", error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});


module.exports = router;