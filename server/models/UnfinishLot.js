const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// 未結批良率主表：以 lotno 為 unique key，只存最新狀態（更新 = destroy CASCADE 後重建）
const UnfinishLot = sequelize.define('UnfinishLot', {
  lotno:      { type: DataTypes.STRING(20), allowNull: false, unique: true },
  day:        { type: DataTypes.DATEONLY, allowNull: false }, // 本次爬取資料日期，前端日期篩選用
  stage:      { type: DataTypes.STRING(20), allowNull: true }, // 站別，由 EqAction.line 推導串接，如 'L1->L5->L3'
  o_qty:      { type: DataTypes.INTEGER, defaultValue: 0 },
  ok_qty:     { type: DataTypes.INTEGER, defaultValue: 0 },
  dl1:        { type: DataTypes.INTEGER, defaultValue: 0 },
  dl2:        { type: DataTypes.INTEGER, defaultValue: 0 },
  dl3:        { type: DataTypes.INTEGER, defaultValue: 0 },
  multi_dl:   { type: DataTypes.INTEGER, defaultValue: 0 }, // 多丁
  ng:         { type: DataTypes.INTEGER, defaultValue: 0 },
  ls:         { type: DataTypes.INTEGER, defaultValue: 0 },
  total:      { type: DataTypes.INTEGER, defaultValue: 0 }, // 總計
  input_qty:  { type: DataTypes.INTEGER, defaultValue: 0 }, // 投入
  yield_rate:    { type: DataTypes.FLOAT, defaultValue: 0 }, // 全良率（97.33% → 97.33）
  recovery_rate: { type: DataTypes.FLOAT, defaultValue: 0 }, // 收率
  product:    { type: DataTypes.STRING(50), allowNull: true }, // 品種
  input_date: { type: DataTypes.DATEONLY, allowNull: true },   // 投入日
}, { timestamps: true, tableName: 'unfinish_lots' });

module.exports = UnfinishLot;
