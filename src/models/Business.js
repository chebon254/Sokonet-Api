const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcrypt');

const Business = sequelize.define('Business', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  businessType: {
    type: DataTypes.ENUM('company', 'individual', 'group'),
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
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  logo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  subscriptionStatus: {
    type: DataTypes.ENUM('trial', 'active', 'suspended'),
    defaultValue: 'trial'
  },
  subscriptionEndDate: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  hooks: {
    beforeCreate: async (business) => {
      business.password = await bcrypt.hash(business.password, parseInt(process.env.SALT_ROUNDS));
    },
    beforeUpdate: async (business) => {
      if (business.changed('password')) {
        business.password = await bcrypt.hash(business.password, parseInt(process.env.SALT_ROUNDS));
      }
    }
  },
  timestamps: true
});

Business.prototype.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

Business.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

module.exports = Business;