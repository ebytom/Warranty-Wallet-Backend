const { default: mongoose, get } = require('mongoose');
const Warranty = require('../models/warranty-model');
const { log } = require('debug/src/browser');
const aws = require('aws-sdk');
const multer = require('multer');

const s3 = new aws.S3({
    region: "eu-north-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    signatureVersion: 'v4'
});

const uploadInvoice = async (file) => {
    console.log("Uploading file to S3:", file); // Debug log for file details

    const params = {
        Bucket: "warranty-wallet",
        Key: `${Date.now()}-${file.originalname}`, // Unique file name in S3
        Body: file.buffer,
        ContentType: file.mimetype,
    };

    const data = await s3.upload(params).promise();
    console.log("File uploaded successfully:", data.Location); // Log uploaded file URL
    return data.Location;
};


const addWarranty = async (req, res) => {
    try {
        const { itemName, category, warrantyProvider, purchasedOn, expiresOn, createdAt, description, addedBy } = req.body;
        const file = req.file;

        let invoiceURL = ""; // Define invoiceURL here so it can be updated in the if block

        if (file) {
            invoiceURL = await uploadInvoice(file); // Update the existing variable instead of redeclaring it
        }

        // Create and save new warranty document with S3 file URL
        const newWarranty = new Warranty({
            itemName,
            category,
            warrantyProvider,
            purchasedOn,
            expiresOn,
            createdAt,
            description,
            addedBy,
            invoiceURL
        });

        const savedWarranty = await newWarranty.save();
        res.status(201).json(savedWarranty);
    } catch (error) {
        console.error('Error adding warranty:', error);
        res.status(500).json({ message: 'Failed to add warranty', error: error.message });
    }
};

const getWarrantyById = async (req, res) => {
    try {
        const { id } = req.params; // Get the ID from the request parameters

        // Validate the ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid warranty ID' });
        }

        // Find the warranty by ID
        const warranty = await Warranty.findById(id).lean();

        if (!warranty) {
            return res.status(404).json({ message: 'Warranty not found' });
        }

        res.status(200).json(warranty);
    } catch (error) {
        console.error('Error fetching warranty by ID:', error);
        res.status(500).json({ message: 'Failed to fetch warranty', error: error.message });
    }
};

const getAllWarrantyByUser = async (req, res) => {    
    try {
        const { addedBy } = req.params;

        console.log(addedBy);

        const warranties = await Warranty.find({ addedBy });

        if (warranties.length === 0) {
            return res.status(404).json({ message: 'No warranty found for this user' });
        }

        const today = new Date();
        const enrichedWarranties = warranties.map(warranty => {
            const purchasedOn = new Date(warranty.purchasedOn);
            const expiresOn = new Date(warranty.expiresOn);

            const totalDays = Math.ceil((expiresOn - purchasedOn) / (1000 * 60 * 60 * 24));
            const daysLeft = Math.max(0, Math.ceil((expiresOn - today) / (1000 * 60 * 60 * 24)));
            const percentage = totalDays > 0 ? ((totalDays - daysLeft) / totalDays) * 100 : 100;

            return {
                ...warranty._doc,
                daysLeft,
                percentage: percentage.toFixed(2) // Round to 2 decimal places
            };
        });

        res.status(200).json(enrichedWarranties);
    } catch (error) {
        console.error('Error fetching warranty by user:', error);
        res.status(500).json({ message: 'Failed to fetch warranty', error: error.message });
    }
};

const updateWarrantyById = async (req, res) => {
    try {
        const { id } = req.params;
        const { itemName, category, warrantyProvider, purchasedOn, expiresOn, description } = req.body;
        const file = req.file; // Get the uploaded file, if any

        console.log(req.body);

        // Validate the ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid warranty ID' });
        }

        // Check if a new file was uploaded, and upload to S3 if so
        let invoiceURL = req.body.invoiceURL;
        if (file) {
            invoiceURL = await uploadInvoice(file); // Upload new file to S3 and get the URL
        }

        // Update the warranty with the provided fields and (possibly new) invoiceURL
        const updatedWarranty = await Warranty.findByIdAndUpdate(
            { _id: id },
            { itemName, category, warrantyProvider, purchasedOn, expiresOn, description, invoiceURL },
            { new: true }
        );

        if (!updatedWarranty) {
            return res.status(404).json({ message: 'Warranty not found' });
        }

        res.status(200).json(updatedWarranty);
    } catch (error) {
        console.error('Error updating warranty:', error);
        res.status(500).json({ message: 'Failed to update warranty', error: error.message });
    }
};

const deleteWarrantyById = async (req, res) => {
    try {
        const { id } = req.params;

        // Validate the warranty ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid warranty ID' });
        }
        const deletedWarranty = await Warranty.findByIdAndDelete(id);

        if (!deletedWarranty) {
            return res.status(404).json({ message: 'Warranty not found' });
        }

        res.status(200).json({ message: 'Warranty deleted' });
    } catch (error) {
        console.error('Error deleting warranty:', error);
        res.status(500).json({ message: 'Failed to delete warranty', error: error.message });
    }
};

const getExpiringWarrantiesByUser = async (req, res) => {
    try {
        const { addedBy } = req.params; 
        const today = new Date();
        const tenDaysLater = new Date(today);
        tenDaysLater.setDate(today.getDate() + 10);

        // Find warranties for the specific user expiring in the next 10 days
        const expiringWarranties = await Warranty.find({
            addedBy,
            expiresOn: { $gte: today, $lte: tenDaysLater }
        });

        if (expiringWarranties.length === 0) {
            return res.status(404).json({ message: 'No warranties expiring in the next 10 days for this user' });
        }

        const result = expiringWarranties.map(warranty => {
            const expiresOn = new Date(warranty.expiresOn);
            const daysLeft = Math.max(0, Math.ceil((expiresOn - today) / (1000 * 60 * 60 * 24)));

            return {
                itemName: warranty.itemName,
                daysLeft
            };
        });

        res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching expiring warranties by user:', error);
        res.status(500).json({ message: 'Failed to fetch expiring warranties', error: error.message });
    }
};


module.exports = {
    addWarranty,
    getWarrantyById,
    getAllWarrantyByUser,
    updateWarrantyById,
    deleteWarrantyById,
    uploadInvoice,
    getExpiringWarrantiesByUser
};
