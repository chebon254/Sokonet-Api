const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcrypt');

const Dispatcher = sequelize.define('Dispatcher', {
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
    defaultValue: 'dispatcher'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  hooks: {
    beforeCreate: async (dispatcher) => {
      dispatcher.password = await bcrypt.hash(dispatcher.password, parseInt(process.env.SALT_ROUNDS));
    },
    beforeUpdate: async (dispatcher) => {
      if (dispatcher.changed('password')) {
        dispatcher.password = await bcrypt.hash(dispatcher.password, parseInt(process.env.SALT_ROUNDS));
      }
    }
  },
  timestamps: true
});

Dispatcher.prototype.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

Dispatcher.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

module.exports = Dispatcher;