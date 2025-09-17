const axios = require('axios');
const crypto = require('crypto');
const { Transaction, Order } = require('../models');
const { PAYMENT_STATUS, PAYMENT_METHODS, TRANSACTION_TYPES } = require('../utils/constants');

class PaymentService {
  constructor() {
    this.pesapalConsumerKey = process.env.PESAPAL_CONSUMER_KEY;
    this.pesapalConsumerSecret = process.env.PESAPAL_CONSUMER_SECRET;
    this.pesapalBaseUrl = process.env.PESAPAL_BASE_URL || 'https://cybqa.pesapal.com/pesapalv3';
    this.callbackUrl = process.env.PESAPAL_CALLBACK_URL || 'http://localhost:3000/api/payments/callback';
    this.ipnUrl = process.env.PESAPAL_IPN_URL || 'http://localhost:3000/api/payments/ipn';

    this.accessToken = null;
    this.tokenExpiresAt = null;
  }

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiresAt && new Date() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(`${this.pesapalBaseUrl}/api/Auth/RequestToken`, {
        consumer_key: this.pesapalConsumerKey,
        consumer_secret: this.pesapalConsumerSecret
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (response.data && response.data.token) {
        this.accessToken = response.data.token;
        // Token typically expires in 5 minutes, we'll refresh after 4 minutes
        this.tokenExpiresAt = new Date(Date.now() + 4 * 60 * 1000);
        return this.accessToken;
      }

      throw new Error('Failed to get access token from Pesapal');
    } catch (error) {
      console.error('Pesapal token request failed:', error.response?.data || error.message);
      throw new Error('Payment system authentication failed');
    }
  }

  async registerIPN() {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(`${this.pesapalBaseUrl}/api/URLSetup/RegisterIPN`, {
        url: this.ipnUrl,
        ipn_notification_type: 'GET'
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('IPN registration failed:', error.response?.data || error.message);
      throw new Error('Payment notification setup failed');
    }
  }

  async initiatePayment(orderData) {
    try {
      const token = await this.getAccessToken();

      const paymentData = {
        id: orderData.id,
        currency: 'KES',
        amount: orderData.totalAmount,
        description: `Order #${orderData.id} - ${orderData.description || 'Food Order'}`,
        callback_url: this.callbackUrl,
        notification_id: await this.getOrCreateIPNId(),
        billing_address: {
          email_address: orderData.customerEmail,
          phone_number: orderData.customerPhone,
          country_code: 'KE',
          first_name: orderData.customerName?.split(' ')[0] || 'Customer',
          last_name: orderData.customerName?.split(' ').slice(1).join(' ') || '',
          line_1: orderData.deliveryAddress || 'Nairobi',
          line_2: '',
          city: 'Nairobi',
          state: 'Nairobi',
          postal_code: '00100',
          zip_code: '00100'
        }
      };

      const response = await axios.post(`${this.pesapalBaseUrl}/api/Transactions/SubmitOrderRequest`, paymentData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.redirect_url) {
        return {
          success: true,
          paymentUrl: response.data.redirect_url,
          trackingId: response.data.tracking_id,
          merchantReference: response.data.merchant_reference
        };
      }

      throw new Error('Invalid payment response from Pesapal');
    } catch (error) {
      console.error('Payment initiation failed:', error.response?.data || error.message);
      throw new Error('Payment initiation failed. Please try again.');
    }
  }

  async getOrCreateIPNId() {
    // In production, store this in database or cache
    // For now, we'll use a static IPN ID or register a new one
    try {
      const ipnResponse = await this.registerIPN();
      return ipnResponse.ipn_id;
    } catch (error) {
      console.error('Failed to get IPN ID:', error);
      return 'default-ipn-id'; // Fallback
    }
  }

  async verifyPayment(trackingId) {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(`${this.pesapalBaseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${trackingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Payment verification failed:', error.response?.data || error.message);
      throw new Error('Payment verification failed');
    }
  }

  async processPaymentCallback(callbackData) {
    try {
      const { OrderTrackingId, OrderMerchantReference } = callbackData;

      if (!OrderTrackingId) {
        throw new Error('Missing tracking ID in callback');
      }

      // Verify payment status with Pesapal
      const paymentStatus = await this.verifyPayment(OrderTrackingId);

      // Find the order
      const order = await Order.findOne({
        where: { id: OrderMerchantReference }
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // Create transaction record
      const transaction = await Transaction.create({
        orderId: order.id,
        userId: order.userId,
        businessId: order.businessId,
        amount: order.totalAmount,
        type: TRANSACTION_TYPES.PURCHASE,
        paymentMethod: PAYMENT_METHODS.CARD,
        status: this.mapPesapalStatus(paymentStatus.payment_status_description),
        trackingId: OrderTrackingId,
        pesapalData: paymentStatus
      });

      // Update order payment status
      await order.update({
        paymentStatus: this.mapPesapalStatus(paymentStatus.payment_status_description),
        paidAt: paymentStatus.payment_status_description === 'COMPLETED' ? new Date() : null
      });

      return {
        success: true,
        order,
        transaction,
        paymentStatus: paymentStatus.payment_status_description
      };
    } catch (error) {
      console.error('Payment callback processing failed:', error);
      throw error;
    }
  }

  mapPesapalStatus(pesapalStatus) {
    switch (pesapalStatus?.toUpperCase()) {
      case 'COMPLETED':
        return PAYMENT_STATUS.PAID;
      case 'FAILED':
      case 'INVALID':
        return PAYMENT_STATUS.FAILED;
      case 'PENDING':
      case 'PROCESSING':
      default:
        return PAYMENT_STATUS.PENDING;
    }
  }

  generateSignature(data, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(data))
      .digest('hex');
  }

  async processRefund(transactionId, amount, reason) {
    try {
      const transaction = await Transaction.findByPk(transactionId);

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.status !== PAYMENT_STATUS.PAID) {
        throw new Error('Cannot refund unpaid transaction');
      }

      // Create refund transaction
      const refundTransaction = await Transaction.create({
        orderId: transaction.orderId,
        userId: transaction.userId,
        businessId: transaction.businessId,
        amount: -Math.abs(amount), // Negative amount for refund
        type: TRANSACTION_TYPES.REFUND,
        paymentMethod: transaction.paymentMethod,
        status: PAYMENT_STATUS.PAID,
        refundReason: reason,
        originalTransactionId: transactionId
      });

      // Update original transaction
      await transaction.update({
        refundedAmount: (transaction.refundedAmount || 0) + amount,
        status: amount >= transaction.amount ? PAYMENT_STATUS.REFUNDED : PAYMENT_STATUS.PAID
      });

      return refundTransaction;
    } catch (error) {
      console.error('Refund processing failed:', error);
      throw error;
    }
  }

  async getTransactionHistory(userId, businessId, options = {}) {
    const { page = 1, limit = 20, type, status, startDate, endDate } = options;
    const offset = (page - 1) * limit;

    const whereClause = {};

    if (userId) whereClause.userId = userId;
    if (businessId) whereClause.businessId = businessId;
    if (type) whereClause.type = type;
    if (status) whereClause.status = status;

    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const { count, rows: transactions } = await Transaction.findAndCountAll({
      where: whereClause,
      include: [{ model: Order, attributes: ['id', 'totalAmount'] }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    return {
      transactions,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(count / limit),
        count,
        perPage: parseInt(limit)
      }
    };
  }
}

module.exports = new PaymentService();