const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const HourlyDefect = sequelize.define('HourlyDefect', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  day: {
    type: DataTypes.STRING,
    allowNull: false
  },
  r1_script: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  g1_script: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  b1_script: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  r2_script: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  g2_script: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  b2_script: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  },
  r1_rb_data: { type: DataTypes.TEXT('long'), allowNull: true },
  r1_ml_data: { type: DataTypes.TEXT('long'), allowNull: true },
  r1_s_data:  { type: DataTypes.TEXT('long'), allowNull: true },
  g1_rb_data: { type: DataTypes.TEXT('long'), allowNull: true },
  g1_ml_data: { type: DataTypes.TEXT('long'), allowNull: true },
  g1_s_data:  { type: DataTypes.TEXT('long'), allowNull: true },
  b1_rb_data: { type: DataTypes.TEXT('long'), allowNull: true },
  b1_ml_data: { type: DataTypes.TEXT('long'), allowNull: true },
  b1_s_data:  { type: DataTypes.TEXT('long'), allowNull: true },
  r2_rb_data: { type: DataTypes.TEXT('long'), allowNull: true },
  r2_ml_data: { type: DataTypes.TEXT('long'), allowNull: true },
  r2_s_data:  { type: DataTypes.TEXT('long'), allowNull: true },
  g2_rb_data: { type: DataTypes.TEXT('long'), allowNull: true },
  g2_ml_data: { type: DataTypes.TEXT('long'), allowNull: true },
  g2_s_data:  { type: DataTypes.TEXT('long'), allowNull: true },
  b2_rb_data: { type: DataTypes.TEXT('long'), allowNull: true },
  b2_ml_data: { type: DataTypes.TEXT('long'), allowNull: true },
  b2_s_data:  { type: DataTypes.TEXT('long'), allowNull: true },
  created: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  // tableName: 'hourly_defects',
  timestamps: false
});

module.exports = HourlyDefect;
