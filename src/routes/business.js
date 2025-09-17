const express = require('express');
const router = express.Router();
const businessController = require('../controllers/business/businessController');
const { protect, authorize } = require('../middlewares/auth');

// Protect all business routes
router.use(protect);
router.use(authorize('business'));

// Profile routes
router.get('/profile', businessController.getProfile);
router.put('/profile', businessController.updateProfile);

// Dashboard
router.get('/dashboard', businessController.getDashboard);

// Staff management
router.get('/staff', businessController.getStaff);
router.post('/staff/dispatcher', businessController.createDispatcher);
router.post('/staff/scanner', businessController.createScanner);

module.exports = router;