const { verifyAccessToken } = require('../config/jwt');
const { User, Business, Dispatcher, Scanner, SuperAdmin } = require('../models');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        error: 'NO_TOKEN'
      });
    }

    const decoded = verifyAccessToken(token);
    req.user = decoded;

    // Verify user still exists and is active
    let user = null;
    switch (decoded.role) {
      case 'user':
        user = await User.findByPk(decoded.id);
        break;
      case 'business':
        user = await Business.findByPk(decoded.id);
        break;
      case 'dispatcher':
        user = await Dispatcher.findByPk(decoded.id);
        break;
      case 'scanner':
        user = await Scanner.findByPk(decoded.id);
        break;
      case 'super_admin':
        user = await SuperAdmin.findByPk(decoded.id);
        break;
      default:
        return res.status(401).json({
          success: false,
          message: 'Invalid user role',
          error: 'INVALID_ROLE'
        });
    }

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive',
        error: 'USER_INACTIVE'
      });
    }

    req.userDetails = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access token expired',
        error: 'TOKEN_EXPIRED'
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid access token',
        error: 'INVALID_TOKEN'
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: 'AUTH_ERROR'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'NO_AUTH'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        error: 'FORBIDDEN'
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  protect: authenticateToken,
  authorize
};