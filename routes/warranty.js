const express = require('express');
const { addWarranty, getWarrantyById, getAllWarrantyByUser, updateWarrantyById, deleteWarrantyById } = require('../controllers/warrantyController');

const router = express.Router();

router.post('/addWarranty', addWarranty);
router.get('/getAllWarrantyByUser/:addedBy', getAllWarrantyByUser); //userid
router.get('/getWarrantyById/:id', getWarrantyById); //truckid
router.delete('/deleteWarrantyById/:id', deleteWarrantyById);
router.put('/updateWarrantyById/:id', updateWarrantyById);

module.exports = router;
