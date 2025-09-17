const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/business/paymentController');
const { protect, authorize } = require('../middlewares/auth');

// Public routes (no authentication needed for callbacks)
router.get('/callback', paymentController.paymentCallback);
router.get('/ipn', paymentController.paymentIPN);

// Protected routes
router.use(protect);

// Payment initiation (users only)
router.post('/initiate', authorize(['user', 'business']), paymentController.initiatePayment);

// Payment verification
router.get('/verify', authorize(['user', 'business']), paymentController.verifyPayment);

// Transaction management
router.get('/transactions', authorize(['user', 'business']), paymentController.getTransactions);

// Business only routes
router.post('/refund', authorize('business'), paymentController.processRefund);
router.get('/stats', authorize('business'), paymentController.getPaymentStats);

module.exports = router;