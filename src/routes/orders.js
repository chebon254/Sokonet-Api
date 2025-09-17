const express = require('express');
const router = express.Router();
const orderController = require('../controllers/business/orderController');
const { protect, authorize } = require('../middlewares/auth');

// Protect all order routes
router.use(protect);

// Order creation (for users with QR codes)
router.post('/', authorize(['user', 'business']), orderController.createOrder);

// Order retrieval
router.get('/', authorize(['user', 'business']), orderController.getOrders);
router.get('/stats', authorize('business'), orderController.getOrderStats);
router.get('/:id', authorize(['user', 'business']), orderController.getOrderById);

// Order management (business only)
router.patch('/:id/status', authorize('business'), orderController.updateOrderStatus);
router.patch('/:id/cancel', authorize(['user', 'business']), orderController.cancelOrder);

module.exports = router;