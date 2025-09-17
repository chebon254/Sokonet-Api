const { sequelize, connectDB } = require('../config/database');
const {
  setupAssociations,
  User,
  Business,
  Dispatcher,
  Scanner,
  ProductCategory,
  Product,
  QRCode,
  Wallet,
  Transaction,
  Order,
  OrderItem,
  SuperAdmin
} = require('./associations');

setupAssociations();

module.exports = {
  sequelize,
  connectDB,
  User,
  Business,
  Dispatcher,
  Scanner,
  ProductCategory,
  Product,
  QRCode,
  Wallet,
  Transaction,
  Order,
  OrderItem,
  SuperAdmin
};