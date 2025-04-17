const express = require('express');
const router = express.Router();
const multer = require("multer");
const multerS3 = require("multer-s3");
//const AWS = require("aws-sdk");
const s3 = require('./aws');

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET_NAME,
        key: (req, file, cb) => {
            cb(null, `logos/${Date.now()}-${file.originalname}`);
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png/;
        if (allowedTypes.test(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Invalid file type. Only JPEG, JPG, and PNG are allowed."));
        }
    },
});

router.get('/', async( req, res)=>{
    const ApplicationSettings = req.db.model('ApplicationSettings', require('../models/ApplicationSettings').schema);

    try{
        const applicationSettings = await ApplicationSettings.findOne();
        res.status(200).json(applicationSettings)
    }
    catch(error){
        res.status(500).json({message:'error finding Application Settings', error})
    }
})

router.put('/', upload.single("companyLogo"), async (req, res) => {
    const ApplicationSettings = req.db.model('ApplicationSettings', require('../models/ApplicationSettings').schema);
    const { primaryThemeColour, secondaryThemeColour } = req.body;
    const companyLogo = req.file ? req.file.location : req.body.companyLogo || null;
    try {
        let applicationSettings = await ApplicationSettings.findOne();
        if (applicationSettings) {
            if (companyLogo!=null) applicationSettings.companyLogo = companyLogo;
            else applicationSettings.companyLogo = "";
            applicationSettings.primaryThemeColour = primaryThemeColour;
            applicationSettings.secondaryThemeColour = secondaryThemeColour;
        } else {
            applicationSettings = new ApplicationSettings({ companyLogo, primaryThemeColour, secondaryThemeColour });
        }

        await applicationSettings.save();
        res.status(200).json({ message: "Application settings updated", data: applicationSettings });
    }
    catch (error) {
        console.error("Error adding Application Settings:", error);
        res.status(500).json({ message: "Error adding Application Settings:", error: error.message });
    }
});

module.exports = router;