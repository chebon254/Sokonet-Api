const rateLimit = require('express-rate-limit');

const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalRateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for super admins
    return req.user && req.user.role === 'super_admin';
  }
});

const uploadRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    success: false,
    message: 'Too many upload attempts, please try again later',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authRateLimiter,
  generalRateLimiter,
  uploadRateLimiter
};