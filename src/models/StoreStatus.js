const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StoreStatus = sequelize.define('StoreStatus', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    store_id: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'store_timezones',
        key: 'store_id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    timestamp_utc: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false
    }
  }, {
    tableName: 'store_status',
    timestamps: false,
    indexes: [
      {
        fields: ['store_id', 'timestamp_utc']
      }
    ]
  });

  return StoreStatus;
};
