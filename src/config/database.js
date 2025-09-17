const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

if (process.env.DB_DIALECT === 'sqlite') {
  // SQLite configuration for development
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || './database/sokonet_dev.sqlite',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      timestamps: true,
      underscored: false
    }
  });
} else {
  // MySQL configuration for production
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: process.env.DB_DIALECT,
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      timezone: '+00:00'
    }
  );
}

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully');

    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('Database synchronized');
    }
  } catch (error) {
    console.error('Unable to connect to the database:', error.message);
    console.log('Continuing without database connection for development...');
    // Don't exit in development mode
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

module.exports = { sequelize, connectDB };