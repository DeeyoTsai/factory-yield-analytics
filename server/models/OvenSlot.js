const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OvenSlot = sequelize.define('OvenSlot', {
  dt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  eqpt_id: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  gid: {
    type: DataTypes.STRING(15),
    allowNull: false,
  },
  sgrid: {
    type: DataTypes.STRING(15),
    allowNull: true,
  },
  cst: {
    type: DataTypes.STRING(15),
    allowNull: true,
  },
  slotno: {
    type: DataTypes.INTEGER,
    defaultValue: -1,
  },
  cure_pos: {
    type: DataTypes.INTEGER,
    allowNull: false,
  }
}, {
  // tableName: 'oven_slots',
  timestamps: true,
  // createdAt: 'created',
  // updatedAt: false,
});

module.exports = OvenSlot;
