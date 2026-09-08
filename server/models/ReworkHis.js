const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// 每片 glass 的重工次數：各站一欄（BM1, BM2, L1..L6），-1 = 未進該站。
const ReworkHis = sequelize.define('ReworkHis', {
  gid: {
    type: DataTypes.STRING(15),
    allowNull: false,
  },
  bm1: { type: DataTypes.INTEGER, defaultValue: -1 },
  bm2: { type: DataTypes.INTEGER, defaultValue: -1 },
  l1: { type: DataTypes.INTEGER, defaultValue: -1 },
  l2: { type: DataTypes.INTEGER, defaultValue: -1 },
  l3: { type: DataTypes.INTEGER, defaultValue: -1 },
  l4: { type: DataTypes.INTEGER, defaultValue: -1 },
  l5: { type: DataTypes.INTEGER, defaultValue: -1 },
  l6: { type: DataTypes.INTEGER, defaultValue: -1 },
}, {
  timestamps: true,
});

module.exports = ReworkHis;
