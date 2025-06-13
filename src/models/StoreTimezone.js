const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StoreTimezone = sequelize.define('StoreTimezone', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    store_id: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      index: true
    },
    timezone_str: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'America/Chicago'
    }
  }, {
    tableName: 'store_timezones',
    timestamps: false
  });

  return StoreTimezone;
};
