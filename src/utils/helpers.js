const crypto = require('crypto');

const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  
  return otp;
};

const generateOrderNumber = (businessId) => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  const businessPart = businessId.substring(0, 4).toUpperCase();
  
  return `ORD-${businessPart}-${timestamp}-${random}`;
};

const generateTransactionReference = () => {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  return `TXN_${dateStr}_${random}`;
};

const calculateOrderTotal = (items, taxRate = 0) => {
  const subtotal = items.reduce((total, item) => {
    return total + (item.unitPrice * item.quantity);
  }, 0);
  
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;
  
  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax: parseFloat(tax.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  };
};

const paginate = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const offset = (page - 1) * limit;
  
  return {
    page,
    limit,
    offset
  };
};

const getPaginationMeta = (totalItems, page, limit) => {
  const totalPages = Math.ceil(totalItems / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;
  
  return {
    totalItems,
    totalPages,
    currentPage: page,
    itemsPerPage: limit,
    hasNext,
    hasPrev,
    nextPage: hasNext ? page + 1 : null,
    prevPage: hasPrev ? page - 1 : null
  };
};

const formatCurrency = (amount, currency = 'KES') => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

const sanitizePhoneNumber = (phone) => {
  // Remove all non-numeric characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with 0, replace with country code
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  }
  
  // Add + if not present
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  
  return cleaned;
};

const generateRandomPassword = (length = 12) => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '@$!%*?&';
  
  const allChars = uppercase + lowercase + numbers + special;
  let password = '';
  
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Fill the rest
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

const isBusinessHours = (businessHours) => {
  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert to minutes
  
  if (!businessHours || !businessHours[currentDay]) {
    return true; // If no hours defined, assume always open
  }
  
  const todayHours = businessHours[currentDay];
  if (!todayHours.open || todayHours.closed) {
    return false;
  }
  
  const [openHour, openMinute] = todayHours.openTime.split(':').map(Number);
  const [closeHour, closeMinute] = todayHours.closeTime.split(':').map(Number);
  
  const openTime = openHour * 60 + openMinute;
  const closeTime = closeHour * 60 + closeMinute;
  
  return currentTime >= openTime && currentTime <= closeTime;
};

const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const hashResetToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const getDateRange = (period) => {
  const endDate = new Date();
  let startDate = new Date();
  
  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(endDate.getMonth() - 1);
      break;
    case 'quarter':
      startDate.setMonth(endDate.getMonth() - 3);
      break;
    case 'year':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(endDate.getDate() - 30);
  }
  
  return { startDate, endDate };
};

module.exports = {
  generateOTP,
  generateOrderNumber,
  generateTransactionReference,
  calculateOrderTotal,
  paginate,
  getPaginationMeta,
  formatCurrency,
  sanitizePhoneNumber,
  generateRandomPassword,
  isBusinessHours,
  generateResetToken,
  hashResetToken,
  getDateRange
};