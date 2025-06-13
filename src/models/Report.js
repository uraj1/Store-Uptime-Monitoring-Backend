const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Report = sequelize.define('Report', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    report_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      index: true
    },
    status: {
      type: DataTypes.ENUM('Running', 'Complete', 'Failed'),
      allowNull: false,
      defaultValue: 'Running'
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: true
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'reports',
    timestamps: false
  });

  return Report;
};