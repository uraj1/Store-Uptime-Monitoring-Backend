const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool
  }
);

// Import models
const StoreStatus = require('./StoreStatus')(sequelize);
const StoreBusinessHours = require('./StoreBusinessHours')(sequelize);
const StoreTimezone = require('./StoreTimezone')(sequelize);
const Report = require('./Report')(sequelize);

// Define associations

// StoreTimezone has many StoreStatus
StoreTimezone.hasMany(StoreStatus, { foreignKey: 'store_id', sourceKey: 'store_id' });
StoreStatus.belongsTo(StoreTimezone, { foreignKey: 'store_id', targetKey: 'store_id' });

// StoreTimezone has many StoreBusinessHours
StoreTimezone.hasMany(StoreBusinessHours, { foreignKey: 'store_id', sourceKey: 'store_id' });
StoreBusinessHours.belongsTo(StoreTimezone, { foreignKey: 'store_id', targetKey: 'store_id' });

module.exports = {
  sequelize,
  StoreStatus,
  StoreBusinessHours,
  StoreTimezone,
  Report
};
