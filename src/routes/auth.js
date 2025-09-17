const express = require('express');
const router = express.Router();
const { validateRequest } = require('../middlewares/validation');
const { authRateLimiter } = require('../middlewares/rateLimit');
const { authSchemas } = require('../utils/validators');
const authController = require('../controllers/auth/authController');

// User authentication routes
router.post('/user/register', authRateLimiter, validateRequest(authSchemas.register), authController.userRegister);
router.post('/user/login', authRateLimiter, validateRequest(authSchemas.login), authController.userLogin);
router.post('/user/verify-email', authRateLimiter, validateRequest(authSchemas.verifyEmail), authController.verifyEmail);
router.post('/user/forgot-password', authRateLimiter, validateRequest(authSchemas.forgotPassword), authController.forgotPassword);
router.post('/user/reset-password', authRateLimiter, validateRequest(authSchemas.resetPassword), authController.resetPassword);

// Business authentication routes
router.post('/business/register', authRateLimiter, validateRequest(authSchemas.businessRegister), authController.businessRegister);
router.post('/business/login', authRateLimiter, validateRequest(authSchemas.login), authController.businessLogin);

// Admin authentication routes
router.post('/admin/login', authRateLimiter, validateRequest(authSchemas.login), authController.adminLogin);

module.exports = router;