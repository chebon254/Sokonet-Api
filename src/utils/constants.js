module.exports = {
  USER_ROLES: {
    USER: 'user',
    BUSINESS: 'business',
    DISPATCHER: 'dispatcher',
    SCANNER: 'scanner',
    SUPER_ADMIN: 'super_admin'
  },

  ORDER_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PREPARING: 'preparing',
    READY: 'ready',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled'
  },

  PAYMENT_STATUS: {
    PENDING: 'pending',
    PAID: 'paid',
    FAILED: 'failed',
    REFUNDED: 'refunded'
  },

  PAYMENT_METHODS: {
    WALLET: 'wallet',
    CARD: 'card',
    MPESA: 'mpesa'
  },

  TRANSACTION_TYPES: {
    TOPUP: 'topup',
    PURCHASE: 'purchase',
    REFUND: 'refund'
  },

  SUBSCRIPTION_STATUS: {
    TRIAL: 'trial',
    ACTIVE: 'active',
    SUSPENDED: 'suspended'
  },

  BUSINESS_TYPES: {
    COMPANY: 'company',
    INDIVIDUAL: 'individual',
    GROUP: 'group'
  },

  FILE_UPLOAD_PATHS: {
    BUSINESS_LOGOS: 'sokonet/uploads/businesses/logos',
    PRODUCT_IMAGES: 'sokonet/uploads/products/images',
    CATEGORY_IMAGES: 'sokonet/uploads/categories/images',
    USER_AVATARS: 'sokonet/uploads/users/avatars',
    QR_CODES: 'sokonet/qrcodes'
  },

  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB

  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
  },

  QR_CODE: {
    MIN_LENGTH: 6,
    MAX_LENGTH: 12,
    DEFAULT_LENGTH: 8
  },

  OTP: {
    LENGTH: 6,
    EXPIRY: 10 * 60 * 1000 // 10 minutes
  },

  PASSWORD_RESET: {
    TOKEN_EXPIRY: 60 * 60 * 1000 // 1 hour
  },

  EMAIL_VERIFICATION: {
    TOKEN_EXPIRY: 24 * 60 * 60 * 1000 // 24 hours
  },

  ERROR_CODES: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    NOT_FOUND: 'NOT_FOUND',
    DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    INVALID_TOKEN: 'INVALID_TOKEN',
    INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
    PAYMENT_FAILED: 'PAYMENT_FAILED',
    FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
    UPLOAD_ERROR: 'UPLOAD_ERROR',
    DELETE_ERROR: 'DELETE_ERROR',
    EMAIL_SEND_ERROR: 'EMAIL_SEND_ERROR',
    QR_CODE_ERROR: 'QR_CODE_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR'
  },

  RESPONSE_MESSAGES: {
    SUCCESS: 'Operation completed successfully',
    CREATED: 'Resource created successfully',
    UPDATED: 'Resource updated successfully',
    DELETED: 'Resource deleted successfully',
    NOT_FOUND: 'Resource not found',
    UNAUTHORIZED: 'Unauthorized access',
    FORBIDDEN: 'Access forbidden',
    BAD_REQUEST: 'Bad request',
    INTERNAL_ERROR: 'Internal server error'
  },

  TRIAL_PERIOD_DAYS: 14,

  MINIMUM_TOPUP_AMOUNT: 10,
  MAXIMUM_TOPUP_AMOUNT: 100000
};