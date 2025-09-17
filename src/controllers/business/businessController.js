const { Business, Dispatcher, Scanner, ProductCategory, Product, QRCode, Order, User } = require('../../models');
const { asyncHandler, AppError } = require('../../middlewares/errorHandler');
const { ERROR_CODES, RESPONSE_MESSAGES } = require('../../utils/constants');
const { Op } = require('sequelize');

const getProfile = asyncHandler(async (req, res) => {
  const business = await Business.findByPk(req.user.id, {
    attributes: { exclude: ['password'] }
  });

  if (!business) {
    throw new AppError(RESPONSE_MESSAGES.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }

  res.status(200).json({
    success: true,
    message: 'Business profile retrieved successfully',
    data: { business }
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { name, businessType, phone, address } = req.body;

  const business = await Business.findByPk(req.user.id);

  if (!business) {
    throw new AppError(RESPONSE_MESSAGES.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }

  // Check if phone is being changed and if it's already taken
  if (phone && phone !== business.phone) {
    const existingBusiness = await Business.findOne({ where: { phone } });
    if (existingBusiness) {
      throw new AppError('Phone number already exists', 400, ERROR_CODES.DUPLICATE_ENTRY);
    }
  }

  await business.update({
    name: name || business.name,
    businessType: businessType || business.businessType,
    phone: phone || business.phone,
    address: address || business.address
  });

  const updatedBusiness = await Business.findByPk(req.user.id, {
    attributes: { exclude: ['password'] }
  });

  res.status(200).json({
    success: true,
    message: RESPONSE_MESSAGES.UPDATED,
    data: { business: updatedBusiness }
  });
});


const getStaff = asyncHandler(async (req, res) => {
  const dispatchers = await Dispatcher.findAll({
    where: { businessId: req.user.id },
    attributes: { exclude: ['password'] }
  });

  const scanners = await Scanner.findAll({
    where: { businessId: req.user.id },
    attributes: { exclude: ['password'] }
  });

  res.status(200).json({
    success: true,
    message: 'Staff retrieved successfully',
    data: {
      dispatchers,
      scanners,
      total: dispatchers.length + scanners.length
    }
  });
});

const createDispatcher = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  // Check if dispatcher already exists
  const existingDispatcher = await Dispatcher.findOne({
    where: {
      [Op.or]: [{ email }, { phone }]
    }
  });

  if (existingDispatcher) {
    throw new AppError('Dispatcher with this email or phone already exists', 400, ERROR_CODES.DUPLICATE_ENTRY);
  }

  const dispatcher = await Dispatcher.create({
    businessId: req.user.id,
    name,
    email,
    phone,
    password
  });

  const dispatcherData = await Dispatcher.findByPk(dispatcher.id, {
    attributes: { exclude: ['password'] }
  });

  res.status(201).json({
    success: true,
    message: RESPONSE_MESSAGES.CREATED,
    data: { dispatcher: dispatcherData }
  });
});

const createScanner = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  // Check if scanner already exists
  const existingScanner = await Scanner.findOne({
    where: {
      [Op.or]: [{ email }, { phone }]
    }
  });

  if (existingScanner) {
    throw new AppError('Scanner with this email or phone already exists', 400, ERROR_CODES.DUPLICATE_ENTRY);
  }

  const scanner = await Scanner.create({
    businessId: req.user.id,
    name,
    email,
    phone,
    password
  });

  const scannerData = await Scanner.findByPk(scanner.id, {
    attributes: { exclude: ['password'] }
  });

  res.status(201).json({
    success: true,
    message: RESPONSE_MESSAGES.CREATED,
    data: { scanner: scannerData }
  });
});

const getDashboard = asyncHandler(async (req, res) => {
  const businessId = req.user.id;

  // Get counts
  const [
    totalProducts,
    totalCategories,
    totalQRCodes,
    totalOrders,
    totalDispatchers,
    totalScanners
  ] = await Promise.all([
    Product.count({ where: { businessId } }),
    ProductCategory.count({ where: { businessId } }),
    QRCode.count({ where: { businessId } }),
    Order.count({ where: { businessId } }),
    Dispatcher.count({ where: { businessId } }),
    Scanner.count({ where: { businessId } })
  ]);

  // Get recent orders
  const recentOrders = await Order.findAll({
    where: { businessId },
    limit: 5,
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }
    ]
  });

  res.status(200).json({
    success: true,
    message: 'Dashboard data retrieved successfully',
    data: {
      stats: {
        totalProducts,
        totalCategories,
        totalQRCodes,
        totalOrders,
        totalDispatchers,
        totalScanners
      },
      recentOrders
    }
  });
});

module.exports = {
  getProfile,
  updateProfile,
  getStaff,
  createDispatcher,
  createScanner,
  getDashboard
};