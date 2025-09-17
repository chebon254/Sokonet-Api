const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcrypt');

const SuperAdmin = sequelize.define('SuperAdmin', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
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
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'super_admin'
  },
  lastLoginIp: {
    type: DataTypes.STRING,
    allowNull: true
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  twoFactorEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  hooks: {
    beforeCreate: async (admin) => {
      admin.password = await bcrypt.hash(admin.password, parseInt(process.env.SALT_ROUNDS));
    },
    beforeUpdate: async (admin) => {
      if (admin.changed('password')) {
        admin.password = await bcrypt.hash(admin.password, parseInt(process.env.SALT_ROUNDS));
      }
    }
  },
  timestamps: true
});

SuperAdmin.prototype.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

SuperAdmin.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

module.exports = SuperAdmin;