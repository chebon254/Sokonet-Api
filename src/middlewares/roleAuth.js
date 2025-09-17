const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: No role found',
        error: 'NO_ROLE'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Insufficient permissions',
        error: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

const authorizeBusinessOwner = async (req, res, next) => {
  if (req.user.role !== 'business') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Business owner only',
      error: 'BUSINESS_ONLY'
    });
  }
  req.businessId = req.user.id;
  next();
};

const authorizeBusinessStaff = async (req, res, next) => {
  if (!['dispatcher', 'scanner', 'business'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Business staff only',
      error: 'STAFF_ONLY'
    });
  }
  
  if (req.user.role === 'business') {
    req.businessId = req.user.id;
  } else {
    req.businessId = req.userDetails.businessId;
  }
  
  next();
};

const authorizeSuperAdmin = async (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Super admin only',
      error: 'ADMIN_ONLY'
    });
  }
  next();
};

module.exports = {
  authorizeRole,
  authorizeBusinessOwner,
  authorizeBusinessStaff,
  authorizeSuperAdmin
};