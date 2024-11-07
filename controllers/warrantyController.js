const { default: mongoose, get } = require('mongoose');
const Warranty = require('../models/warranty-model');

const addWarranty = async (req, res) => {
    try {
        const { itemName, category, warrantyProvider, purchasedOn, expiresOn, createdAt, description, addedBy, invoiceURL } = req.body;

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
        console.error('Error adding warranty:', error); // Log the full error
        res.status(500).json({ message:'Failed to add warranty', error: error.message });
    }
};

const getWarrantyById = async (req, res) => {
    try {
        const { id } = req.params; // Get the ID from the request parameters

        // Validate the ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid warranty ID' });
        }

        // Find the truck by ID
        const warranty = await Warranty.findById(id);

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
        

        const warranty = await Warranty.find({ addedBy });

        if (warranty.length === 0) {
            return res.status(404).json({ message: 'No warranty found for this user' });
        }

        res.status(200).json(warranty);
    } catch (error) {
        console.error('Error fetching warranty by user:', error);
        res.status(500).json({ message: 'Failed to fetch warranty', error: error.message });
    }
};

const updateWarrantyById = async (req, res) => {
    try {
        const { id } = req.params;
        const { itemName, category, warrantyProvider, purchasedOn, expiresOn, createdAt, description, addedBy, invoiceURL } = req.body.values;

        // Validate the ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid warranty ID' });
        }

        // Update the warranty with the provided fields
        const updatedWarranty = await Warranty.findByIdAndUpdate(
            {_id:id},
            { itemName, category, warrantyProvider, purchasedOn, expiresOn, createdAt, description, addedBy, invoiceURL },
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
}

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

module.exports = {
    addWarranty,
    getWarrantyById,
    getAllWarrantyByUser,
    updateWarrantyById,
    deleteWarrantyById
};
