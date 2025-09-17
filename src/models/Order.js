const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  businessId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  dispatcherId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  orderNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  tax: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.ENUM('wallet', 'card', 'mpesa'),
    allowNull: false
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
    defaultValue: 'pending'
  },
  orderStatus: {
    type: DataTypes.ENUM('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'),
    defaultValue: 'pending'
  },
  qrCodeScanned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  scannedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['businessId', 'orderNumber']
    },
    {
      fields: ['businessId', 'orderStatus']
    },
    {
      fields: ['userId']
    }
  ]
});

module.exports = Order;