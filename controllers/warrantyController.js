const { default: mongoose } = require('mongoose');
const Warranty = require('../models/warranty-model');
const aws = require('aws-sdk');
const multer = require('multer');

const s3 = new aws.S3({
    region: "eu-north-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    signatureVersion: 'v4'
});

// Uploads a file to S3
const uploadInvoice = async (file) => {
    console.log("Uploading file to S3:", file);

    const params = {
        Bucket: "warranty-wallet",
        Key: `${Date.now()}-${file.originalname}`,
        Body: file.buffer,
        ContentType: file.mimetype,
    };

    const data = await s3.upload(params).promise();
    console.log("File uploaded successfully:", data.Location);
    return data.Location;
};

// Adds a new warranty
const addWarranty = async (req, res) => {
    try {
        const { itemName, category, warrantyProvider, purchasedOn, expiresOn, createdAt, description, addedBy } = req.body;
        const file = req.file;

        let invoiceURL = "";

        if (file) {
            invoiceURL = await uploadInvoice(file);
        }

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

// Fetches warranty by ID
const getWarrantyById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid warranty ID' });
        }

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

// Fetches all warranties by user, including shared warranties
const getAllWarrantyByUser = async (req, res) => {    
    try {
        const { addedBy } = req.params;
        
        const userWarranties = await Warranty.find({ addedBy });
        const sharedWarranties = await Warranty.find({ sharedWith: addedBy });

        const warranties = [...userWarranties, ...sharedWarranties];

        if (warranties.length === 0) {
            return res.status(404).json({ message: 'No warranties found for this user' });
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
                percentage: percentage.toFixed(2)
            };
        });

        res.status(200).json(enrichedWarranties);
    } catch (error) {
        console.error('Error fetching warranties by user:', error);
        res.status(500).json({ message: 'Failed to fetch warranties', error: error.message });
    }
};

// Shares access to a warranty by adding email to the 'sharedWith' array
const shareAccess = async (req, res) => {
    try {
        const { id } = req.params;
        const { email } = req.body;

        const warranty = await Warranty.findById(id);

        if (!warranty) {
            return res.status(404).json({ message: 'Warranty not found' });
        }

        if (warranty.sharedWith.includes(email)) {
            return res.status(400).json({ message: 'Access already shared with this email' });
        }

        const user = await User.findOne({ email });  // Assuming you have a User model to validate the user
        if (!user) {
            return res.status(404).json({ message: 'Invalid user' });
        }

        warranty.sharedWith.push(email);
        await warranty.save();

        res.status(200).json({ message: 'Access shared successfully' });
    } catch (error) {
        console.error('Error sharing access:', error);
        res.status(500).json({ message: 'Failed to share access', error: error.message });
    }
};

// Revokes access by removing an email from the 'sharedWith' array
const revokeAccess = async (req, res) => {
    try {
        const { id } = req.params;
        const { email } = req.body;

        const warranty = await Warranty.findById(id);

        if (!warranty) {
            return res.status(404).json({ message: 'Warranty not found' });
        }

        warranty.sharedWith = warranty.sharedWith.filter(sharedEmail => sharedEmail !== email);
        await warranty.save();

        res.status(200).json({ message: 'Access revoked successfully' });
    } catch (error) {
        console.error('Error revoking access:', error);
        res.status(500).json({ message: 'Failed to revoke access', error: error.message });
    }
};

// Updates warranty by ID
const updateWarrantyById = async (req, res) => {
    try {
        const { id } = req.params;
        const { itemName, category, warrantyProvider, purchasedOn, expiresOn, description } = req.body;
        const file = req.file;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid warranty ID' });
        }

        let invoiceURL = req.body.invoiceURL;
        if (file) {
            invoiceURL = await uploadInvoice(file);
        }

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

// Deletes a warranty by ID
const deleteWarrantyById = async (req, res) => {
    try {
        const { id } = req.params;

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

// Fetches warranties expiring soon
const getExpiringWarrantiesByUser = async (req, res) => {
    try {
        const { addedBy } = req.params; 
        const today = new Date();
        const tenDaysLater = new Date(today);
        tenDaysLater.setDate(today.getDate() + 10);

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
    getExpiringWarrantiesByUser,
    shareAccess,
    revokeAccess
};
