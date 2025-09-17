const { sendEmail } = require('../config/email');
const { generateOTP } = require('../utils/helpers');

class EmailService {
  async sendWelcomeEmail(user, userType = 'user') {
    const otp = generateOTP();
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to ${process.env.APP_NAME}!</h2>
        <p>Hi ${user.name},</p>
        <p>Thank you for ${userType === 'business' ? 'registering your business' : 'signing up'} with us.</p>
        <p>Please verify your email address using the OTP below:</p>
        <div style="background: #f4f4f4; padding: 15px; text-align: center; margin: 20px 0;">
          <h1 style="color: #4CAF50; margin: 0;">${otp}</h1>
        </div>
        <p>This OTP will expire in 10 minutes.</p>
        <p>Best regards,<br>${process.env.APP_NAME} Team</p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: `Welcome to ${process.env.APP_NAME} - Verify Your Email`,
      html,
      text: `Welcome to ${process.env.APP_NAME}! Your verification OTP is: ${otp}`
    });

    return otp;
  }

  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hi ${user.name},</p>
        <p>We received a request to reset your password.</p>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>${process.env.APP_NAME} Team</p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html,
      text: `Password reset requested. Visit this link to reset: ${resetUrl}`
    });
  }

  async sendOrderConfirmation(order, user) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Confirmation</h2>
        <p>Hi ${user.name},</p>
        <p>Your order has been confirmed!</p>
        <div style="background: #f9f9f9; padding: 20px; margin: 20px 0; border-left: 4px solid #4CAF50;">
          <h3 style="margin-top: 0;">Order Details</h3>
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p><strong>Total Amount:</strong> KES ${order.total}</p>
          <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
          <p><strong>Status:</strong> ${order.orderStatus}</p>
        </div>
        <h3>Order Items:</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f4f4f4;">
              <th style="padding: 10px; text-align: left;">Item</th>
              <th style="padding: 10px; text-align: right;">Qty</th>
              <th style="padding: 10px; text-align: right;">Price</th>
              <th style="padding: 10px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.orderItems.map(item => `
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.product.name}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${item.quantity}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">KES ${item.unitPrice}</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">KES ${item.totalPrice}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 10px; text-align: right;"><strong>Subtotal:</strong></td>
              <td style="padding: 10px; text-align: right;"><strong>KES ${order.subtotal}</strong></td>
            </tr>
            <tr>
              <td colspan="3" style="padding: 10px; text-align: right;"><strong>Tax:</strong></td>
              <td style="padding: 10px; text-align: right;"><strong>KES ${order.tax}</strong></td>
            </tr>
            <tr>
              <td colspan="3" style="padding: 10px; text-align: right;"><strong>Total:</strong></td>
              <td style="padding: 10px; text-align: right;"><strong>KES ${order.total}</strong></td>
            </tr>
          </tfoot>
        </table>
        <p>Thank you for your order!</p>
        <p>Best regards,<br>${process.env.APP_NAME} Team</p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: `Order Confirmation - ${order.orderNumber}`,
      html,
      text: `Your order ${order.orderNumber} has been confirmed. Total: KES ${order.total}`
    });
  }

  async sendQRCodeAssignment(user, qrCode) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">QR Code Assigned</h2>
        <p>Hi ${user.name},</p>
        <p>A QR code has been assigned to your account.</p>
        <div style="background: #f9f9f9; padding: 20px; margin: 20px 0; text-align: center;">
          <p><strong>Your QR Code:</strong></p>
          <h2 style="color: #4CAF50; margin: 10px 0;">${qrCode.code}</h2>
          <img src="${qrCode.imageUrl}" alt="QR Code" style="max-width: 200px; margin: 20px auto;">
        </div>
        <p>Present this QR code when making purchases at participating restaurants.</p>
        <p>Best regards,<br>${process.env.APP_NAME} Team</p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: 'Your QR Code Has Been Assigned',
      html,
      text: `Your QR code ${qrCode.code} has been assigned to your account.`
    });
  }

  async sendWalletTopupConfirmation(user, transaction) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Wallet Top-up Successful</h2>
        <p>Hi ${user.name},</p>
        <p>Your wallet has been successfully topped up.</p>
        <div style="background: #f9f9f9; padding: 20px; margin: 20px 0; border-left: 4px solid #4CAF50;">
          <h3 style="margin-top: 0;">Transaction Details</h3>
          <p><strong>Reference:</strong> ${transaction.paymentReference}</p>
          <p><strong>Amount:</strong> KES ${transaction.amount}</p>
          <p><strong>Payment Method:</strong> ${transaction.paymentMethod}</p>
          <p><strong>Status:</strong> ${transaction.status}</p>
          <p><strong>New Balance:</strong> KES ${user.wallet.balance}</p>
        </div>
        <p>Thank you for using ${process.env.APP_NAME}!</p>
        <p>Best regards,<br>${process.env.APP_NAME} Team</p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: 'Wallet Top-up Confirmation',
      html,
      text: `Your wallet has been topped up with KES ${transaction.amount}. New balance: KES ${user.wallet.balance}`
    });
  }

  async sendStaffAccountCreated(staff, password, businessName) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Staff Account Created</h2>
        <p>Hi ${staff.name},</p>
        <p>An account has been created for you at ${businessName}.</p>
        <div style="background: #f9f9f9; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Account Details</h3>
          <p><strong>Email:</strong> ${staff.email}</p>
          <p><strong>Temporary Password:</strong> ${password}</p>
          <p><strong>Role:</strong> ${staff.role}</p>
        </div>
        <p style="color: #ff6b6b;"><strong>Important:</strong> Please change your password immediately after your first login.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/login" style="background: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Login Now</a>
        </div>
        <p>Best regards,<br>${businessName} Team</p>
      </div>
    `;

    await sendEmail({
      to: staff.email,
      subject: `Staff Account Created - ${businessName}`,
      html,
      text: `Your staff account has been created. Email: ${staff.email}, Password: ${password}`
    });
  }

  async sendOrderStatusUpdate(order, user) {
    const statusMessages = {
      confirmed: 'Your order has been confirmed and is being processed.',
      preparing: 'Your order is being prepared.',
      ready: 'Your order is ready for pickup!',
      delivered: 'Your order has been delivered. Enjoy your meal!',
      cancelled: 'Your order has been cancelled.'
    };

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Status Update</h2>
        <p>Hi ${user.name},</p>
        <p>${statusMessages[order.orderStatus]}</p>
        <div style="background: #f9f9f9; padding: 20px; margin: 20px 0; border-left: 4px solid #4CAF50;">
          <h3 style="margin-top: 0;">Order Details</h3>
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p><strong>Status:</strong> <span style="color: #4CAF50; font-weight: bold;">${order.orderStatus.toUpperCase()}</span></p>
        </div>
        <p>Thank you for your patience!</p>
        <p>Best regards,<br>${process.env.APP_NAME} Team</p>
      </div>
    `;

    await sendEmail({
      to: user.email,
      subject: `Order ${order.orderNumber} - Status Update`,
      html,
      text: `Order ${order.orderNumber} status: ${order.orderStatus}. ${statusMessages[order.orderStatus]}`
    });
  }
}

module.exports = new EmailService();