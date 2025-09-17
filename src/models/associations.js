const User = require('./User');
const Business = require('./Business');
const Dispatcher = require('./Dispatcher');
const Scanner = require('./Scanner');
const ProductCategory = require('./ProductCategory');
const Product = require('./Product');
const QRCode = require('./QRCode');
const Wallet = require('./Wallet');
const Transaction = require('./Transaction');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const SuperAdmin = require('./SuperAdmin');

const setupAssociations = () => {
  // Business associations
  Business.hasMany(ProductCategory, { foreignKey: 'businessId', as: 'categories' });
  Business.hasMany(Product, { foreignKey: 'businessId', as: 'products' });
  Business.hasMany(QRCode, { foreignKey: 'businessId', as: 'qrCodes' });
  Business.hasMany(Order, { foreignKey: 'businessId', as: 'orders' });
  Business.hasMany(Dispatcher, { foreignKey: 'businessId', as: 'dispatchers' });
  Business.hasMany(Scanner, { foreignKey: 'businessId', as: 'scanners' });

  // ProductCategory associations
  ProductCategory.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });
  ProductCategory.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });

  // Product associations
  Product.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });
  Product.belongsTo(ProductCategory, { foreignKey: 'categoryId', as: 'category' });
  Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems' });

  // Dispatcher associations
  Dispatcher.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });
  Dispatcher.hasMany(Order, { foreignKey: 'dispatcherId', as: 'orders' });

  // Scanner associations
  Scanner.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });
  Scanner.hasMany(QRCode, { foreignKey: 'assignedBy', as: 'assignedQRCodes' });

  // User associations
  User.hasOne(Wallet, { foreignKey: 'userId', as: 'wallet' });
  User.hasOne(QRCode, { foreignKey: 'userId', as: 'qrCode' });
  User.hasMany(Transaction, { foreignKey: 'userId', as: 'transactions' });
  User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });

  // Wallet associations
  Wallet.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Wallet.hasMany(Transaction, { foreignKey: 'walletId', as: 'transactions' });

  // Transaction associations
  Transaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Transaction.belongsTo(Wallet, { foreignKey: 'walletId', as: 'wallet' });
  Transaction.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

  // QRCode associations
  QRCode.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });
  QRCode.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  QRCode.belongsTo(Scanner, { foreignKey: 'assignedBy', as: 'scanner' });

  // Order associations
  Order.belongsTo(Business, { foreignKey: 'businessId', as: 'business' });
  Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  Order.belongsTo(Dispatcher, { foreignKey: 'dispatcherId', as: 'dispatcher' });
  Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'orderItems' });
  Order.hasMany(Transaction, { foreignKey: 'orderId', as: 'transactions' });

  // OrderItem associations
  OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
  OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
};

module.exports = {
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
};