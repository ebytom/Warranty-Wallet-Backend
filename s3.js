require('dotenv').config();
const aws = require('aws-sdk');

const region = "eu-north-1";
const bucketName = "warranty-wallet";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

const s3 = new aws.S3({
    region,
    accessKeyId,
    secretAccessKey,
    signatureVersion: 'v4'
});

const uploadFile = async (fileContent, fileName) => {
    const params = {
        Bucket: bucketName,
        Key: fileName,
        Body: fileContent,
    };

    try {
        const data = await s3.upload(params).promise();
        console.log(`File uploaded successfully. ${data.Location}`);
        return data.Location;
    } catch (err) {
        console.error("Error uploading file: ", err);
        throw err;
    }
};

// Test upload
(async () => {
    const fileContent = "Sample file content";  // Replace with actual file data for a real test
    const fileName = "sample_test.txt";
    try {
        const fileUrl = await uploadFile(fileContent, fileName);
        console.log("Test successful! File accessible at: ", fileUrl);
    } catch (error) {
        console.error("Test failed: ", error);
    }
})();
