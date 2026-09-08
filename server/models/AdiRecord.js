const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// ADI（After-Develop Inspection）每片 glass 的各站檢出摘要。
// 站別欄位對應 config/stations.js 的順序：BM1, BM2, L1..L6, AOI。
// 每欄存該站的檢出結果字串（Y/N/數量，依來源而定）。
const AdiRecord = sequelize.define('AdiRecord', {
  gid: {
    type: DataTypes.STRING(15),
    allowNull: false,
    unique: true,
  },
  inrecord: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  bm1: { type: DataTypes.STRING(15), allowNull: false },
  bm2: { type: DataTypes.STRING(15), allowNull: false },
  l1: { type: DataTypes.STRING(15), allowNull: false },
  l2: { type: DataTypes.STRING(15), allowNull: false },
  l3: { type: DataTypes.STRING(15), allowNull: false },
  l4: { type: DataTypes.STRING(15), allowNull: false },
  l5: { type: DataTypes.STRING(15), allowNull: false },
  l6: { type: DataTypes.STRING(15), allowNull: false },
  aoi: { type: DataTypes.STRING(15), allowNull: false },
}, {
  timestamps: true,
});

module.exports = AdiRecord;
