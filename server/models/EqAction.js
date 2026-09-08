const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EqAction = sequelize.define('EqAction', {
  startend: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  line: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  eq: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  action: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  lot: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  period: {
    type: DataTypes.INTEGER,
    defaultValue: -1,
  },
  product: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  handler: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  begintime: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  endtime: {
    type: DataTypes.STRING(20),
    allowNull: false,
  }
}, {
  // tableName: 'eq_actions',
  timestamps: true,
  // createdAt: 'created',
  // updatedAt: false,
});

module.exports = EqAction;
