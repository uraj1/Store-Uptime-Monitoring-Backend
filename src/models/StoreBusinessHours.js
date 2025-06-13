const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StoreBusinessHours = sequelize.define('StoreBusinessHours', {
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
    day_of_week: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0,
        max: 6
      }
    },
    start_time_local: {
      type: DataTypes.TIME,
      allowNull: false
    },
    end_time_local: {
      type: DataTypes.TIME,
      allowNull: false
    }
  }, {
    tableName: 'store_business_hours',
    timestamps: false,
    indexes: [
      {
        fields: ['store_id', 'day_of_week']
      }
    ]
  });

  return StoreBusinessHours;
};
