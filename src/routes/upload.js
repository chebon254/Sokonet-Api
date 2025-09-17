const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/business/uploadController');
const { protect, authorize } = require('../middlewares/auth');

// Protect all upload routes
router.use(protect);
router.use(authorize('business'));

// Single file upload
router.post('/single', uploadController.upload.single('file'), uploadController.uploadSingleFile);

// Multiple files upload
router.post('/multiple', uploadController.upload.array('files', 5), uploadController.uploadMultipleFiles);

// Product image upload
router.post('/product/:productId/image', uploadController.upload.single('image'), uploadController.uploadProductImage);

// Business logo upload
router.post('/logo', uploadController.upload.single('logo'), uploadController.uploadBusinessLogo);

// File management
router.get('/', uploadController.getUploadedFiles);
router.delete('/', uploadController.deleteFile);

module.exports = router;