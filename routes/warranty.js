const express = require('express');
const { addWarranty, getWarrantyById, getAllWarrantyByUser, updateWarrantyById, deleteWarrantyById, uploadInvoice } = require('../controllers/warrantyController');
const multer = require('multer');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(), // Store file in memory for direct upload to S3
    limits: { fileSize: 5 * 1024 * 1024 } // Optional: limit file size to 5MB
});

router.post('/addWarranty',upload.single("invoiceFile"), addWarranty);
router.post('/uploadInvoice', uploadInvoice);
router.get('/getAllWarrantyByUser/:addedBy', getAllWarrantyByUser); //userid
router.get('/getWarrantyById/:id', getWarrantyById); //truckid
router.delete('/deleteWarrantyById/:id', deleteWarrantyById);
router.put('/updateWarrantyById/:id',upload.single("invoiceFile"), updateWarrantyById);

module.exports = router;
