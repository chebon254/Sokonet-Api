const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcrypt');

const Scanner = sequelize.define('Scanner', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  businessId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'scanner'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  hooks: {
    beforeCreate: async (scanner) => {
      scanner.password = await bcrypt.hash(scanner.password, parseInt(process.env.SALT_ROUNDS));
    },
    beforeUpdate: async (scanner) => {
      if (scanner.changed('password')) {
        scanner.password = await bcrypt.hash(scanner.password, parseInt(process.env.SALT_ROUNDS));
      }
    }
  },
  timestamps: true
});

Scanner.prototype.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

Scanner.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

module.exports = Scanner;