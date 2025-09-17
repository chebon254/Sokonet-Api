const Joi = require('joi');

// Common validation patterns
const patterns = {
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  phone: /^\+?[0-9]{10,15}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
};

// Auth validation schemas
const authSchemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(patterns.phone).required(),
    password: Joi.string().pattern(patterns.password).required()
      .messages({
        'string.pattern.base': 'Password must be at least 8 characters with uppercase, lowercase, number and special character'
      })
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  businessRegister: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    businessType: Joi.string().valid('company', 'individual', 'group').required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(patterns.phone).required(),
    password: Joi.string().pattern(patterns.password).required(),
    address: Joi.string().max(500).optional()
  }),

  updateBusinessProfile: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    businessType: Joi.string().valid('company', 'individual', 'group').optional(),
    phone: Joi.string().pattern(patterns.phone).optional(),
    address: Joi.string().max(500).optional()
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required()
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: Joi.string().pattern(patterns.password).required()
  }),

  changePassword: Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().pattern(patterns.password).required()
  }),

  verifyEmail: Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).required()
  })
};

// Product validation schemas
const productSchemas = {
  createCategory: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500).optional()
  }),

  updateCategory: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(500).optional(),
    isActive: Joi.boolean().optional()
  }),

  createProduct: Joi.object({
    categoryId: Joi.string().pattern(patterns.uuid).required(),
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500).optional(),
    price: Joi.number().min(0).required(),
    sku: Joi.string().min(2).max(50).required(),
    stock: Joi.number().integer().min(0).optional(),
    isAvailable: Joi.boolean().optional()
  }),

  updateProduct: Joi.object({
    categoryId: Joi.string().pattern(patterns.uuid).optional(),
    name: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(500).optional(),
    price: Joi.number().min(0).optional(),
    sku: Joi.string().min(2).max(50).optional(),
    stock: Joi.number().integer().min(0).optional(),
    isAvailable: Joi.boolean().optional()
  }),

  updateStock: Joi.object({
    stock: Joi.number().integer().min(0).required(),
    operation: Joi.string().valid('set', 'add', 'subtract').optional()
  })
};

// Staff validation schemas
const staffSchemas = {
  createStaff: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(patterns.phone).required(),
    password: Joi.string().pattern(patterns.password).required(),
    role: Joi.string().valid('dispatcher', 'scanner').required()
  }),

  updateStaff: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().pattern(patterns.phone).optional(),
    isActive: Joi.boolean().optional()
  })
};

// QR Code validation schemas
const qrCodeSchemas = {
  generateQRCodes: Joi.object({
    quantity: Joi.number().integer().min(1).max(1000).required(),
    options: Joi.object({
      errorCorrectionLevel: Joi.string().valid('L', 'M', 'Q', 'H').optional(),
      size: Joi.number().integer().min(100).max(500).optional(),
      format: Joi.string().valid('png', 'jpeg', 'svg').optional()
    }).optional()
  }),

  generatePDF: Joi.object({
    qrCodeIds: Joi.array().items(Joi.string().pattern(patterns.uuid)).min(1).required(),
    layout: Joi.object({
      codesPerRow: Joi.number().integer().min(1).max(10).optional(),
      codesPerPage: Joi.number().integer().min(1).max(100).optional(),
      qrSize: Joi.string().optional(),
      includeCodeText: Joi.boolean().optional(),
      includeBusinessHeader: Joi.boolean().optional()
    }).optional()
  }),

  scanAssignment: Joi.object({
    qrCodeData: Joi.string().required(),
    customerId: Joi.string().pattern(patterns.uuid).required(),
    customerVerification: Joi.object({
      name: Joi.string().required(),
      phone: Joi.string().pattern(patterns.phone).required()
    }).optional()
  })
};

// Order validation schemas
const orderSchemas = {
  createOrder: Joi.object({
    userId: Joi.string().pattern(patterns.uuid).required(),
    items: Joi.array().items(
      Joi.object({
        productId: Joi.string().pattern(patterns.uuid).required(),
        quantity: Joi.number().integer().min(1).required(),
        notes: Joi.string().max(500).optional()
      })
    ).min(1).required(),
    paymentMethod: Joi.string().valid('wallet', 'card', 'mpesa').required(),
    notes: Joi.string().max(500).optional()
  }),

  updateOrderStatus: Joi.object({
    status: Joi.string().valid(
      'pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'
    ).required()
  }),

  processPayment: Joi.object({
    orderId: Joi.string().pattern(patterns.uuid).required(),
    customerId: Joi.string().pattern(patterns.uuid).required(),
    qrCode: Joi.string().required(),
    paymentMethod: Joi.string().valid('wallet', 'card', 'mpesa').required(),
    amount: Joi.number().min(0).required()
  })
};

// Wallet validation schemas
const walletSchemas = {
  topup: Joi.object({
    amount: Joi.number().min(10).max(100000).required(),
    paymentMethod: Joi.string().valid('card', 'mpesa').required()
  })
};

// Query validation schemas
const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).optional(),
    limit: Joi.number().integer().min(1).max(100).optional(),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid('ASC', 'DESC').optional()
  }),

  dateRange: Joi.object({
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
  }),

  search: Joi.object({
    q: Joi.string().min(1).max(100).optional(),
    field: Joi.string().optional()
  })
};

// ID validation schemas
const idSchemas = {
  uuid: Joi.object({
    id: Joi.string().pattern(patterns.uuid).required()
  }),
  
  code: Joi.object({
    code: Joi.string().min(6).max(12).required()
  })
};

module.exports = {
  patterns,
  authSchemas,
  productSchemas,
  staffSchemas,
  qrCodeSchemas,
  orderSchemas,
  walletSchemas,
  querySchemas,
  idSchemas
};