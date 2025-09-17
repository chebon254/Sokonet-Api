const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  walletId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('topup', 'purchase', 'refund'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  paymentMethod: {
    type: DataTypes.ENUM('card', 'mpesa', 'wallet'),
    allowNull: false
  },
  paymentReference: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
    allowNull: false,
    defaultValue: 'pending'
  },
  orderId: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    {
      fields: ['userId', 'type']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = Transaction;