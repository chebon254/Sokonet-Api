const { Sequelize } = require('sequelize');
require('dotenv').config();

// Enhanced MySQL configuration with better error handling and connection options
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
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false, // Disable SSL for development if it's causing issues
      connectTimeout: 60000, // 60 seconds
      acquireTimeout: 60000,
      timeout: 60000,
      // Add charset to prevent connection issues
      charset: 'utf8mb4'
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 60000, // Increased from 30s to 60s
      idle: 10000,
      evict: 1000,
      handleDisconnects: true
    },
    define: {
      timestamps: true,
      underscored: false,
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    },
    // Retry connection attempts
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

      if (process.env.NODE_ENV === 'development') {
        await sequelize.sync({ alter: true });
        console.log('✅ Database synchronized');
      }
      
      return; // Success, exit the retry loop
      
    } catch (error) {
      console.error(`❌ Database connection attempt failed:`, error.name);
      console.error(`   Message: ${error.message}`);
      
      if (error.original) {
        console.error(`   Original error: ${error.original.code || error.original.message}`);
      }
      
      retries--;
      
      if (retries > 0) {
        console.log(`Retrying in 5 seconds... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      } else {
        console.error('\n❌ All database connection attempts failed.');
        console.log('\n🔧 Troubleshooting steps:');
        console.log('1. Check if your IP is whitelisted in DigitalOcean database settings');
        console.log('2. Verify database credentials in .env file');
        console.log('3. Test connection manually: run `node troubleshoot-db.js`');
        console.log('4. Check if database server is running');
        console.log('5. Try connecting without SSL first');
        
        console.log('\nContinuing without database connection for development...');
        
        // Don't exit in development mode
        if (process.env.NODE_ENV === 'production') {
          console.error('Exiting in production mode due to database connection failure');
          process.exit(1);
        }
      }
    }
  }
};

// Test database connection without Sequelize (for debugging)
const testRawConnection = async () => {
  const mysql = require('mysql2/promise');
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: false, // Test without SSL first
      connectTimeout: 30000
    });
    
    console.log('✅ Raw MySQL connection successful');
    
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ Query test successful');
    
    await connection.end();
    return true;
  } catch (error) {
    console.error('❌ Raw MySQL connection failed:', error.message);
    return false;
  }
};

module.exports = { 
  sequelize, 
  connectDB, 
  testRawConnection 
};