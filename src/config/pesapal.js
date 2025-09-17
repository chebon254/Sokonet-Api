const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

class PesapalClient {
  constructor() {
    this.consumerKey = process.env.PESAPAL_CONSUMER_KEY;
    this.consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;
    this.environment = process.env.PESAPAL_ENVIRONMENT || 'sandbox';
    this.callbackUrl = process.env.PESAPAL_CALLBACK_URL;
    
    this.baseUrl = this.environment === 'production'
      ? 'https://pay.pesapal.com/v3'
      : 'https://cybqa.pesapal.com/pesapalv3';
    
    this.token = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    if (this.token && this.tokenExpiry && this.tokenExpiry > Date.now()) {
      return this.token;
    }

    try {
      const response = await axios.post(`${this.baseUrl}/api/Auth/RequestToken`, {
        consumer_key: this.consumerKey,
        consumer_secret: this.consumerSecret
      });

      this.token = response.data.token;
      this.tokenExpiry = Date.now() + (response.data.expiryDate * 1000);
      
      return this.token;
    } catch (error) {
      console.error('Pesapal token error:', error);
      throw new Error('Failed to get Pesapal access token');
    }
  }

  async registerIPN() {
    const token = await this.getAccessToken();
    
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/URLSetup/RegisterIPN`,
        {
          url: this.callbackUrl,
          ipn_notification_type: 'POST'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.ipn_id;
    } catch (error) {
      console.error('IPN registration error:', error);
      throw new Error('Failed to register IPN');
    }
  }

  async initiatePayment(orderData) {
    const token = await this.getAccessToken();
    const ipnId = await this.registerIPN();
    
    const payload = {
      id: orderData.reference,
      currency: 'KES',
      amount: orderData.amount,
      description: orderData.description,
      callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
      notification_id: ipnId,
      billing_address: {
        email_address: orderData.email,
        phone_number: orderData.phone,
        first_name: orderData.firstName,
        last_name: orderData.lastName
      }
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/Transactions/SubmitOrderRequest`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return {
        orderId: response.data.order_tracking_id,
        merchantReference: response.data.merchant_reference,
        redirectUrl: response.data.redirect_url
      };
    } catch (error) {
      console.error('Payment initiation error:', error);
      throw new Error('Failed to initiate payment');
    }
  }

  async getTransactionStatus(orderTrackingId) {
    const token = await this.getAccessToken();
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Transaction status error:', error);
      throw new Error('Failed to get transaction status');
    }
  }

  verifyWebhookSignature(payload, signature) {
    const hash = crypto
      .createHmac('sha256', this.consumerSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return hash === signature;
  }
}

module.exports = new PesapalClient();