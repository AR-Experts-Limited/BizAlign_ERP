const AWS = require('aws-sdk');

// Set up AWS S3
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

// Utility function to format date and time
const getFormattedTimestamp = () => {
    const now = new Date();
    return `${now.getDate()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now
        .getFullYear()
        .toString()}${now.getHours().toString().padStart(2, '0')}${now.getMinutes()
            .toString()
            .padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
};

// Utility function to generate S3 path
const generateS3Path = (databaseName, userId, folder, fileName, extension = '') => {
    return `${databaseName}/${userId}/${folder}/${fileName}${extension}`;
};

// Function to upload image or buffer to S3
const uploadToS3 = async (databaseName, file, userId, folder, fileType, progressCallback = null) => {
    const formattedDate = getFormattedTimestamp();
    const fileName = `${userId}-${formattedDate}-${fileType}`;
    const s3Path = generateS3Path(databaseName, userId, folder, fileName);

    const Body = file.buffer;
    const ContentType = file.mimetype || 'application/octet-stream';

    if (!Body) {
        console.error("🛑 No file buffer detected! Upload failed.");
        throw new Error("No file or buffer provided for upload.");
    }

    const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: s3Path,
        Body,
        ContentType,
    };

    try {
        const upload = s3.upload(params);

        upload.on("httpUploadProgress", (progress) => {
            if (progressCallback) {
                const percentCompleted = Math.round((progress.loaded * 100) / progress.total);
                progressCallback(percentCompleted);
            }
        });

        const data = await upload.promise();

        return { url: data.Location, key: params.Key, eTag: data.ETag };
    } catch (err) {
        console.error("❌ S3 UPLOAD ERROR:", err.message);
        throw new Error(`Error uploading file to S3: ${err.message}`);
    }
};


// Function to upload PDFs specifically to S3
const uploadPdfToS3 = async (databaseName, pdfBuffer, userId, folder, fileName) => {
    if (!pdfBuffer) {
        throw new Error('No PDF buffer provided for upload.');
    }

    const s3Path = generateS3Path(databaseName, userId, folder, fileName, '.pdf');

    const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: s3Path,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
    };

    try {
        const data = await s3.upload(params).promise();
        return { url: data.Location, key: params.Key, eTag: data.ETag }; // Return metadata
    } catch (err) {
        throw new Error(`Error uploading PDF to S3: ${err.message}`);
    }
};


const listObjectsFromS3 = async (prefix) => {
    const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Prefix: prefix,
    };

    try {
        const data = await s3.listObjectsV2(params).promise();
        return data.Contents.map((item) => ({
            key: item.Key,
            url: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${item.Key}`,
        }));
    } catch (err) {
        throw new Error(`Error listing objects from S3: ${err.message}`);
    }
};

module.exports = { uploadToS3, uploadPdfToS3, listObjectsFromS3 };

