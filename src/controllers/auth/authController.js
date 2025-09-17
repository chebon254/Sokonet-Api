const { User, Business, SuperAdmin, Wallet } = require('../../models');
const { Op } = require('sequelize');
const { generateTokenPair } = require('../../config/jwt');
const { asyncHandler, AppError } = require('../../middlewares/errorHandler');
const emailService = require('../../services/emailService');
const { generateOTP, generateResetToken, hashResetToken } = require('../../utils/helpers');
const { ERROR_CODES } = require('../../utils/constants');

// Store OTPs temporarily (in production, use Redis)
const otpStore = new Map();
const resetTokenStore = new Map();

const userRegister = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    where: {
      [Op.or]: [{ email }, { phone }]
    }
  });

  if (existingUser) {
    throw new AppError('User with this email or phone already exists', 409, ERROR_CODES.DUPLICATE_ENTRY);
  }

  // Create user
  const user = await User.create({
    name,
    email,
    phone,
    password
  });

  // Create wallet for user
  await Wallet.create({
    userId: user.id
  });

  // Send verification email
  const otp = await emailService.sendWelcomeEmail(user, 'user');
  otpStore.set(email, { otp, expires: Date.now() + 10 * 60 * 1000 }); // 10 minutes

  res.status(201).json({
    success: true,
    message: 'User registered successfully. Please verify your email.',
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        emailVerified: user.emailVerified
      }
    }
  });
});

const userLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await User.findOne({ where: { email } });
  
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid credentials', 401, ERROR_CODES.INVALID_CREDENTIALS);
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated', 401, ERROR_CODES.UNAUTHORIZED);
  }

  // Generate tokens
  const tokens = generateTokenPair({
    id: user.id,
    email: user.email,
    role: 'user'
  });

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user,
      tokens
    }
  });
});

const businessRegister = asyncHandler(async (req, res) => {
  const { name, businessType, email, phone, password, address } = req.body;

  // Check if business already exists
  const existingBusiness = await Business.findOne({
    where: {
      [Op.or]: [{ email }, { phone }]
    }
  });

  if (existingBusiness) {
    throw new AppError('Business with this email or phone already exists', 409, ERROR_CODES.DUPLICATE_ENTRY);
  }

  // Set trial end date (14 days from now)
  const subscriptionEndDate = new Date();
  subscriptionEndDate.setDate(subscriptionEndDate.getDate() + 14);

  // Create business
  const business = await Business.create({
    name,
    businessType,
    email,
    phone,
    password,
    address,
    subscriptionEndDate
  });

  // Send verification email
  const otp = await emailService.sendWelcomeEmail(business, 'business');
  otpStore.set(email, { otp, expires: Date.now() + 10 * 60 * 1000 });

  res.status(201).json({
    success: true,
    message: 'Business registered successfully. Please verify your email.',
    data: {
      business: {
        id: business.id,
        name: business.name,
        businessType: business.businessType,
        email: business.email,
        phone: business.phone,
        isVerified: business.isVerified,
        subscriptionStatus: business.subscriptionStatus,
        subscriptionEndDate: business.subscriptionEndDate
      }
    }
  });
});

const businessLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find business
  const business = await Business.findOne({ where: { email } });
  
  if (!business || !(await business.comparePassword(password))) {
    throw new AppError('Invalid credentials', 401, ERROR_CODES.INVALID_CREDENTIALS);
  }

  if (!business.isActive) {
    throw new AppError('Account is deactivated', 401, ERROR_CODES.UNAUTHORIZED);
  }

  if (business.subscriptionStatus === 'suspended') {
    throw new AppError('Account is suspended. Please contact support.', 401, ERROR_CODES.UNAUTHORIZED);
  }

  // Generate tokens
  const tokens = generateTokenPair({
    id: business.id,
    email: business.email,
    role: 'business'
  });

  res.json({
    success: true,
    message: 'Login successful',
    data: {
      business,
      tokens
    }
  });
});

const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find admin
  const admin = await SuperAdmin.findOne({ where: { email } });
  
  if (!admin || !(await admin.comparePassword(password))) {
    throw new AppError('Invalid credentials', 401, ERROR_CODES.INVALID_CREDENTIALS);
  }

  if (!admin.isActive) {
    throw new AppError('Account is deactivated', 401, ERROR_CODES.UNAUTHORIZED);
  }

  // Update last login IP
  const clientIp = req.ip || req.connection.remoteAddress;
  await admin.update({ lastLoginIp: clientIp });

  // Generate tokens
  const tokens = generateTokenPair({
    id: admin.id,
    email: admin.email,
    role: 'super_admin'
  });

  res.json({
    success: true,
    message: 'Admin login successful',
    data: {
      admin,
      tokens
    }
  });
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  // Check OTP
  const storedOTP = otpStore.get(email);
  if (!storedOTP || storedOTP.expires < Date.now()) {
    throw new AppError('OTP expired', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  if (storedOTP.otp !== otp) {
    throw new AppError('Invalid OTP', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  // Verify user
  const user = await User.findOne({ where: { email } });
  if (user) {
    await user.update({ emailVerified: true });
    otpStore.delete(email);
    
    return res.json({
      success: true,
      message: 'Email verified successfully',
      data: { user }
    });
  }

  // Verify business
  const business = await Business.findOne({ where: { email } });
  if (business) {
    await business.update({ isVerified: true });
    otpStore.delete(email);
    
    return res.json({
      success: true,
      message: 'Email verified successfully',
      data: { business }
    });
  }

  throw new AppError('User not found', 404, ERROR_CODES.NOT_FOUND);
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Find user in any table
  let user = await User.findOne({ where: { email } });
  if (!user) {
    user = await Business.findOne({ where: { email } });
  }
  if (!user) {
    user = await SuperAdmin.findOne({ where: { email } });
  }

  if (!user) {
    // Don't reveal if email exists or not
    return res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent.'
    });
  }

  // Generate reset token
  const resetToken = generateResetToken();
  const hashedToken = hashResetToken(resetToken);
  
  // Store reset token temporarily
  resetTokenStore.set(hashedToken, {
    email,
    expires: Date.now() + 60 * 60 * 1000 // 1 hour
  });

  // Send reset email
  await emailService.sendPasswordResetEmail(user, resetToken);

  res.json({
    success: true,
    message: 'Password reset link sent to your email'
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  const hashedToken = hashResetToken(token);
  const resetData = resetTokenStore.get(hashedToken);

  if (!resetData || resetData.expires < Date.now()) {
    throw new AppError('Invalid or expired reset token', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  // Find and update user
  let user = await User.findOne({ where: { email: resetData.email } });
  if (user) {
    await user.update({ password });
    resetTokenStore.delete(hashedToken);
    
    return res.json({
      success: true,
      message: 'Password reset successfully'
    });
  }

  // Check business
  user = await Business.findOne({ where: { email: resetData.email } });
  if (user) {
    await user.update({ password });
    resetTokenStore.delete(hashedToken);
    
    return res.json({
      success: true,
      message: 'Password reset successfully'
    });
  }

  // Check admin
  user = await SuperAdmin.findOne({ where: { email: resetData.email } });
  if (user) {
    await user.update({ password });
    resetTokenStore.delete(hashedToken);
    
    return res.json({
      success: true,
      message: 'Password reset successfully'
    });
  }

  throw new AppError('User not found', 404, ERROR_CODES.NOT_FOUND);
});

module.exports = {
  userRegister,
  userLogin,
  businessRegister,
  businessLogin,
  adminLogin,
  verifyEmail,
  forgotPassword,
  resetPassword
};