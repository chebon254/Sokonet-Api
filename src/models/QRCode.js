const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const QRCode = sequelize.define('QRCode', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  businessId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false
  },
  qrData: {
    type: DataTypes.JSON,
    allowNull: false
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    unique: true
  },
  assignedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  assignedBy: {
    type: DataTypes.UUID,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isPrinted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  printedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  scannedCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  lastScannedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['businessId', 'code']
    }
  ]
});

module.exports = QRCode;