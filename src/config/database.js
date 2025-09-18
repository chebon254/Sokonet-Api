const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Debug CA certificate loading
const caCertPath = path.join(__dirname, '../../ca-certificate.crt');
console.log('🔍 CA Certificate path:', caCertPath);
console.log('🔍 CA Certificate exists:', fs.existsSync(caCertPath));

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      ssl: {
        rejectUnauthorized: false
      },
      connectTimeout: 120000, // 2 minutes
      charset: 'utf8mb4'
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 100000, // Increased acquire timeout
      idle: 30000,     // Increased idle timeout
      // Remove 'evict' and 'handleDisconnects' - these cause warnings in mysql2
    },
    define: {
      timestamps: true,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    },
    retry: {
      match: [
        /ETIMEDOUT/,
        /EHOSTUNREACH/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /ENOTFOUND/,
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/,
        /SequelizeDatabaseError/,
        /ER_LOCK_DEADLOCK/
      ],
      max: 3
    }
  }
);

const connectDB = async () => {
  let retries = 3;
  
  while (retries > 0) {
    try {
      console.log(`Attempting to connect to database... (${4 - retries}/3)`);
      console.log(`Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
      console.log(`Database: ${process.env.DB_NAME}`);
      console.log(`User: ${process.env.DB_USER}`);
      
      await sequelize.authenticate();
      console.log('✅ Database connected successfully');

      // Safe database sync: No auto-alter to prevent deadlocks and excessive operations
      if (process.env.NODE_ENV === 'development') {
        try {
          // Only sync without altering existing tables
          await sequelize.sync({ force: false, alter: false });
          console.log('✅ Database synchronized (safe mode - no table alterations)');
          console.log('💡 Use `npm run migrate` for schema changes');
        } catch (syncError) {
          console.log('⚠️  Database sync skipped due to conflicts');
          console.log('   Use migrations for schema changes instead');
          console.log(`   Error: ${syncError.message}`);
        }
      }
      
      return;
      
    } catch (error) {
      console.error(`❌ Database connection failed:`, error.name);
      console.error(`   Message: ${error.message}`);
      
      if (error.original) {
        console.error(`   Error code: ${error.original.code || 'Unknown'}`);
      }
      
      retries--;
      
      if (retries > 0) {
        console.log(`Retrying in 5 seconds... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.error('\n❌ All database connection attempts failed.');
        
        if (process.env.NODE_ENV === 'production') {
          console.error('Exiting in production mode due to database connection failure');
          process.exit(1);
        } else {
          console.log('Continuing without database sync for development...');
        }
      }
    }
  }
};

module.exports = { 
  sequelize, 
  connectDB
};