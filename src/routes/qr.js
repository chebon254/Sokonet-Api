const express = require('express');
const router = express.Router();
const qrController = require('../controllers/business/qrController');
const { protect, authorize } = require('../middlewares/auth');

// Protect all QR routes
router.use(protect);
router.use(authorize('business'));

// QR Code generation and management
router.post('/generate', qrController.generateQRCodes);
router.get('/', qrController.getQRCodes);
router.get('/stats', qrController.getQRCodeStats);

// QR Code assignment
router.patch('/:id/assign', qrController.assignQRCode);
router.patch('/:id/unassign', qrController.unassignQRCode);

// QR Code status management
router.patch('/:id/status', qrController.toggleQRCodeStatus);

// PDF generation
router.post('/pdf', qrController.generatePrintablePDF);

// QR Code deletion
router.delete('/:id', qrController.deleteQRCode);

module.exports = router;