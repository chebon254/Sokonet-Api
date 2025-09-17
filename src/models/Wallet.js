const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Wallet = sequelize.define('Wallet', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true
  },
  balance: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    validate: {
      min: 0
    }
  },
  totalTopups: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  totalSpent: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true
});

module.exports = Wallet;