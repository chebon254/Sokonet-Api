const { Order, Transaction, User } = require('../../models');
const { asyncHandler, AppError } = require('../../middlewares/errorHandler');
const { ERROR_CODES, RESPONSE_MESSAGES, PAYMENT_STATUS, ORDER_STATUS } = require('../../utils/constants');
const paymentService = require('../../services/paymentService');
const { Op } = require('sequelize');

const initiatePayment = asyncHandler(async (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    throw new AppError('Order ID is required', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  // Find the order
  const order = await Order.findOne({
    where: {
      id: orderId,
      userId: req.user.id,
      paymentStatus: PAYMENT_STATUS.PENDING
    },
    include: [{ model: User, attributes: ['name', 'email', 'phone'] }]
  });

  if (!order) {
    throw new AppError('Order not found or already paid', 404, ERROR_CODES.NOT_FOUND);
  }

  try {
    // Prepare payment data
    const paymentData = {
      id: order.id,
      totalAmount: order.totalAmount,
      description: `Order payment for ${order.User.name}`,
      customerEmail: order.User.email,
      customerPhone: order.User.phone,
      customerName: order.User.name,
      deliveryAddress: order.deliveryAddress
    };

    const paymentResult = await paymentService.initiatePayment(paymentData);

    // Store payment tracking information
    await Transaction.create({
      orderId: order.id,
      userId: order.userId,
      businessId: order.businessId,
      amount: order.totalAmount,
      type: 'purchase',
      paymentMethod: 'card',
      status: PAYMENT_STATUS.PENDING,
      trackingId: paymentResult.trackingId,
      merchantReference: paymentResult.merchantReference
    });

    res.status(200).json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        paymentUrl: paymentResult.paymentUrl,
        trackingId: paymentResult.trackingId,
        orderId: order.id,
        amount: order.totalAmount
      }
    });
  } catch (error) {
    console.error('Payment initiation error:', error);
    throw new AppError(error.message || 'Payment initiation failed', 500, ERROR_CODES.PAYMENT_FAILED);
  }
});

const paymentCallback = asyncHandler(async (req, res) => {
  try {
    const callbackData = req.query; // Pesapal sends data as query parameters

    console.log('Payment callback received:', callbackData);

    const result = await paymentService.processPaymentCallback(callbackData);

    if (result.success && result.paymentStatus === 'COMPLETED') {
      // Update order status to confirmed if payment is successful
      await result.order.update({
        status: ORDER_STATUS.CONFIRMED,
        confirmedAt: new Date()
      });
    }

    // Redirect to success or failure page
    const redirectUrl = result.paymentStatus === 'COMPLETED'
      ? `${process.env.FRONTEND_URL}/payment/success?orderId=${result.order.id}`
      : `${process.env.FRONTEND_URL}/payment/failed?orderId=${result.order.id}`;

    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Payment callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/payment/error`);
  }
});

const paymentIPN = asyncHandler(async (req, res) => {
  try {
    const ipnData = req.query; // Pesapal IPN data

    console.log('Payment IPN received:', ipnData);

    // Process the IPN notification
    await paymentService.processPaymentCallback(ipnData);

    res.status(200).send('OK');
  } catch (error) {
    console.error('Payment IPN error:', error);
    res.status(500).send('ERROR');
  }
});

const verifyPayment = asyncHandler(async (req, res) => {
  const { trackingId, orderId } = req.query;

  if (!trackingId && !orderId) {
    throw new AppError('Tracking ID or Order ID is required', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  try {
    let order;

    if (orderId) {
      order = await Order.findOne({
        where: {
          id: orderId,
          userId: req.user.id
        },
        include: [{ model: Transaction }]
      });

      if (!order) {
        throw new AppError('Order not found', 404, ERROR_CODES.NOT_FOUND);
      }
    }

    let paymentStatus;
    if (trackingId) {
      paymentStatus = await paymentService.verifyPayment(trackingId);
    }

    res.status(200).json({
      success: true,
      message: 'Payment status retrieved',
      data: {
        order: order ? {
          id: order.id,
          paymentStatus: order.paymentStatus,
          status: order.status,
          totalAmount: order.totalAmount
        } : null,
        paymentVerification: paymentStatus,
        trackingId
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    throw new AppError(error.message || 'Payment verification failed', 500, ERROR_CODES.PAYMENT_FAILED);
  }
});

const getTransactions = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    type,
    status,
    startDate,
    endDate
  } = req.query;

  const userId = req.user.role === 'user' ? req.user.id : null;
  const businessId = req.user.role === 'business' ? req.user.id : null;

  try {
    const result = await paymentService.getTransactionHistory(userId, businessId, {
      page,
      limit,
      type,
      status,
      startDate,
      endDate
    });

    res.status(200).json({
      success: true,
      message: 'Transactions retrieved successfully',
      data: result
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    throw new AppError('Failed to retrieve transactions', 500, ERROR_CODES.INTERNAL_ERROR);
  }
});

const processRefund = asyncHandler(async (req, res) => {
  const { transactionId, amount, reason } = req.body;

  if (!transactionId || !amount || !reason) {
    throw new AppError('Transaction ID, amount, and reason are required', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  // Verify the transaction belongs to this business
  const transaction = await Transaction.findOne({
    where: {
      id: transactionId,
      businessId: req.user.id,
      status: PAYMENT_STATUS.PAID
    }
  });

  if (!transaction) {
    throw new AppError('Transaction not found or cannot be refunded', 404, ERROR_CODES.NOT_FOUND);
  }

  if (amount > transaction.amount) {
    throw new AppError('Refund amount cannot exceed transaction amount', 400, ERROR_CODES.VALIDATION_ERROR);
  }

  try {
    const refundTransaction = await paymentService.processRefund(transactionId, amount, reason);

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: {
        refundTransaction: {
          id: refundTransaction.id,
          amount: refundTransaction.amount,
          reason: refundTransaction.refundReason,
          processedAt: refundTransaction.createdAt
        },
        originalTransaction: {
          id: transaction.id,
          refundedAmount: transaction.refundedAmount + amount
        }
      }
    });
  } catch (error) {
    console.error('Refund processing error:', error);
    throw new AppError(error.message || 'Refund processing failed', 500, ERROR_CODES.PAYMENT_FAILED);
  }
});

const getPaymentStats = asyncHandler(async (req, res) => {
  const businessId = req.user.id;
  const { period = 'month' } = req.query;

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
    totalRevenue,
    totalTransactions,
    paidTransactions,
    pendingTransactions,
    refundedAmount,
    periodRevenue
  ] = await Promise.all([
    Transaction.sum('amount', {
      where: {
        businessId,
        status: PAYMENT_STATUS.PAID,
        amount: { [Op.gt]: 0 } // Exclude refunds
      }
    }) || 0,
    Transaction.count({ where: { businessId } }),
    Transaction.count({ where: { businessId, status: PAYMENT_STATUS.PAID } }),
    Transaction.count({ where: { businessId, status: PAYMENT_STATUS.PENDING } }),
    Transaction.sum('amount', {
      where: {
        businessId,
        status: PAYMENT_STATUS.PAID,
        amount: { [Op.lt]: 0 } // Refunds are negative
      }
    }) || 0,
    Transaction.sum('amount', {
      where: {
        businessId,
        status: PAYMENT_STATUS.PAID,
        amount: { [Op.gt]: 0 },
        createdAt: dateFilter
      }
    }) || 0
  ]);

  res.status(200).json({
    success: true,
    message: 'Payment statistics retrieved successfully',
    data: {
      totalRevenue,
      totalTransactions,
      paidTransactions,
      pendingTransactions,
      refundedAmount: Math.abs(refundedAmount),
      periodRevenue,
      period,
      netRevenue: totalRevenue - Math.abs(refundedAmount)
    }
  });
});

module.exports = {
  initiatePayment,
  paymentCallback,
  paymentIPN,
  verifyPayment,
  getTransactions,
  processRefund,
  getPaymentStats
};