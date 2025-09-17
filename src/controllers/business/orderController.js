const { Order, OrderItem, Product, User, QRCode } = require('../../models');
const { asyncHandler, AppError } = require('../../middlewares/errorHandler');
const { ERROR_CODES, RESPONSE_MESSAGES, ORDER_STATUS, PAYMENT_STATUS } = require('../../utils/constants');
const { Op } = require('sequelize');

const createOrder = asyncHandler(async (req, res) => {
  const {
    items, // Array of { productId, quantity, price }
    paymentMethod,
    deliveryAddress,
    notes,
    qrCodeId
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new AppError('Order items are required', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  if (!qrCodeId) {
    throw new AppError('QR code ID is required', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  // Verify QR code exists and belongs to user
  const qrCode = await QRCode.findOne({
    where: {
      id: qrCodeId,
      userId: req.user.id,
      isActive: true
    }
  });

  if (!qrCode) {
    throw new AppError('Invalid or inactive QR code', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  const businessId = qrCode.businessId;

  // Validate products and calculate total
  let totalAmount = 0;
  const validatedItems = [];

  for (const item of items) {
    const product = await Product.findOne({
      where: {
        id: item.productId,
        businessId,
        isActive: true
      }
    });

    if (!product) {
      throw new AppError(`Product ${item.productId} not found or inactive`, 400, ERROR_CODES.NOT_FOUND);
    }

    if (product.stock < item.quantity) {
      throw new AppError(`Insufficient stock for ${product.name}. Available: ${product.stock}`, 400, ERROR_CODES.VALIDATION_ERROR);
    }

    const itemTotal = product.price * item.quantity;
    totalAmount += itemTotal;

    validatedItems.push({
      productId: product.id,
      quantity: item.quantity,
      price: product.price,
      total: itemTotal
    });
  }

  // Create order
  const order = await Order.create({
    businessId,
    userId: req.user.id,
    qrCodeId,
    totalAmount,
    paymentMethod: paymentMethod || 'cash',
    paymentStatus: PAYMENT_STATUS.PENDING,
    status: ORDER_STATUS.PENDING,
    deliveryAddress,
    notes
  });

  // Create order items
  const orderItems = await OrderItem.bulkCreate(
    validatedItems.map(item => ({
      orderId: order.id,
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
      total: item.total
    }))
  );

  // Update product stock
  for (const item of validatedItems) {
    await Product.update(
      { stock: Product.sequelize.literal(`stock - ${item.quantity}`) },
      { where: { id: item.productId } }
    );
  }

  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: {
      order: {
        id: order.id,
        totalAmount: order.totalAmount,
        status: order.status,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt
      },
      items: orderItems.length,
      qrCode: qrCode.code
    }
  });
});

const getOrders = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    status,
    paymentStatus,
    search,
    startDate,
    endDate
  } = req.query;

  const offset = (page - 1) * limit;
  const whereClause = {};

  // Business orders (for business users) or user orders (for regular users)
  if (req.user.role === 'business') {
    whereClause.businessId = req.user.id;
  } else {
    whereClause.userId = req.user.id;
  }

  if (status) {
    whereClause.status = status;
  }

  if (paymentStatus) {
    whereClause.paymentStatus = paymentStatus;
  }

  if (startDate && endDate) {
    whereClause.createdAt = {
      [Op.between]: [new Date(startDate), new Date(endDate)]
    };
  }

  const { count, rows: orders } = await Order.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: OrderItem,
        include: [{ model: Product, attributes: ['name', 'image'] }]
      },
      {
        model: User,
        attributes: ['name', 'email', 'phone']
      },
      {
        model: QRCode,
        attributes: ['code']
      }
    ],
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [['createdAt', 'DESC']]
  });

  res.status(200).json({
    success: true,
    message: 'Orders retrieved successfully',
    data: {
      orders,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(count / limit),
        count,
        perPage: parseInt(limit)
      }
    }
  });
});

const getOrderById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const whereClause = { id };

  // Access control
  if (req.user.role === 'business') {
    whereClause.businessId = req.user.id;
  } else {
    whereClause.userId = req.user.id;
  }

  const order = await Order.findOne({
    where: whereClause,
    include: [
      {
        model: OrderItem,
        include: [{ model: Product }]
      },
      {
        model: User,
        attributes: ['name', 'email', 'phone']
      },
      {
        model: QRCode,
        attributes: ['code']
      }
    ]
  });

  if (!order) {
    throw new AppError(RESPONSE_MESSAGES.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }

  res.status(200).json({
    success: true,
    message: 'Order retrieved successfully',
    data: { order }
  });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!Object.values(ORDER_STATUS).includes(status)) {
    throw new AppError('Invalid order status', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  const order = await Order.findOne({
    where: {
      id,
      businessId: req.user.id // Only business can update order status
    }
  });

  if (!order) {
    throw new AppError(RESPONSE_MESSAGES.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }

  // Validate status transitions
  const validTransitions = {
    [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PREPARING]: [ORDER_STATUS.READY, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.READY]: [ORDER_STATUS.DELIVERED],
    [ORDER_STATUS.DELIVERED]: [],
    [ORDER_STATUS.CANCELLED]: []
  };

  if (!validTransitions[order.status].includes(status)) {
    throw new AppError(`Cannot change status from ${order.status} to ${status}`, 400, ERROR_CODES.VALIDATION_ERROR);
  }

  await order.update({
    status,
    [`${status}At`]: new Date()
  });

  res.status(200).json({
    success: true,
    message: `Order ${status} successfully`,
    data: {
      order: {
        id: order.id,
        status: order.status,
        updatedAt: order.updatedAt
      }
    }
  });
});

const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const whereClause = { id };

  // Access control - both business and customer can cancel
  if (req.user.role === 'business') {
    whereClause.businessId = req.user.id;
  } else {
    whereClause.userId = req.user.id;
  }

  const order = await Order.findOne({
    where: whereClause,
    include: [{ model: OrderItem }]
  });

  if (!order) {
    throw new AppError(RESPONSE_MESSAGES.NOT_FOUND, 404, ERROR_CODES.NOT_FOUND);
  }

  if (order.status === ORDER_STATUS.DELIVERED) {
    throw new AppError('Cannot cancel delivered order', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  if (order.status === ORDER_STATUS.CANCELLED) {
    throw new AppError('Order is already cancelled', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  // Restore product stock
  for (const item of order.OrderItems) {
    await Product.update(
      { stock: Product.sequelize.literal(`stock + ${item.quantity}`) },
      { where: { id: item.productId } }
    );
  }

  await order.update({
    status: ORDER_STATUS.CANCELLED,
    cancelledAt: new Date(),
    cancellationReason: reason,
    cancelledBy: req.user.id
  });

  res.status(200).json({
    success: true,
    message: 'Order cancelled successfully',
    data: {
      order: {
        id: order.id,
        status: order.status,
        cancelledAt: order.cancelledAt
      }
    }
  });
});

const getOrderStats = asyncHandler(async (req, res) => {
  const businessId = req.user.id;
  const { period = 'week' } = req.query; // week, month, year

  let dateFilter = {};
  const now = new Date();

  switch (period) {
    case 'week':
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { [Op.gte]: weekAgo };
      break;
    case 'month':
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFilter = { [Op.gte]: monthAgo };
      break;
    case 'year':
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      dateFilter = { [Op.gte]: yearAgo };
      break;
  }

  const [
    totalOrders,
    pendingOrders,
    completedOrders,
    cancelledOrders,
    totalRevenue,
    periodOrders
  ] = await Promise.all([
    Order.count({ where: { businessId } }),
    Order.count({ where: { businessId, status: ORDER_STATUS.PENDING } }),
    Order.count({ where: { businessId, status: ORDER_STATUS.DELIVERED } }),
    Order.count({ where: { businessId, status: ORDER_STATUS.CANCELLED } }),
    Order.sum('totalAmount', { where: { businessId, status: ORDER_STATUS.DELIVERED } }) || 0,
    Order.count({ where: { businessId, createdAt: dateFilter } })
  ]);

  res.status(200).json({
    success: true,
    message: 'Order statistics retrieved successfully',
    data: {
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      totalRevenue,
      periodOrders,
      period
    }
  });
});

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
  getOrderStats
};