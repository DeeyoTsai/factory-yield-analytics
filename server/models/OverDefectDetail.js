const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OverDefectDetail = sequelize.define('OverDefectDetail', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  startend: {
    type: DataTypes.STRING(100), // 增加長度以防萬一
    allowNull: true
  },
  stop: {
    type: DataTypes.STRING(10), // 站點名稱 (如 L1, L2)
    allowNull: true
  },
  eq: {
    type: DataTypes.STRING(20), // 機台編號
    allowNull: true
  },
  product: {
    type: DataTypes.STRING(50), // 產品名稱
    allowNull: true
  },
  gid: {
    type: DataTypes.STRING(30), // 基板 ID
    allowNull: true
  },
  dt: {
    type: DataTypes.DATE, // 檢測時間
    allowNull: true
  },
  df_sum: {
    type: DataTypes.INTEGER, // 總缺陷點數
    defaultValue: 0
  },
  // RB (反射黑) 檢測數據: S(小), M(中), L(大), SUM(總和)
  rb_s: { type: DataTypes.INTEGER, defaultValue: 0 },
  rb_m: { type: DataTypes.INTEGER, defaultValue: 0 },
  rb_l: { type: DataTypes.INTEGER, defaultValue: 0 },
  rb_sum: { type: DataTypes.INTEGER, defaultValue: 0 },
  // RW (反射白) 檢測數據
  rw_s: { type: DataTypes.INTEGER, defaultValue: 0 },
  rw_m: { type: DataTypes.INTEGER, defaultValue: 0 },
  rw_l: { type: DataTypes.INTEGER, defaultValue: 0 },
  rw_sum: { type: DataTypes.INTEGER, defaultValue: 0 },
  // TB (透過黑) 檢測數據
  tb_s: { type: DataTypes.INTEGER, defaultValue: 0 },
  tb_m: { type: DataTypes.INTEGER, defaultValue: 0 },
  tb_l: { type: DataTypes.INTEGER, defaultValue: 0 },
  tb_sum: { type: DataTypes.INTEGER, defaultValue: 0 },
  // TW (透過白) 檢測數據
  tw_s: { type: DataTypes.INTEGER, defaultValue: 0 },
  tw_m: { type: DataTypes.INTEGER, defaultValue: 0 },
  tw_l: { type: DataTypes.INTEGER, defaultValue: 0 },
  tw_sum: { type: DataTypes.INTEGER, defaultValue: 0 },
  
  map_path: {
    type: DataTypes.STRING(255), // 缺陷圖路徑
    allowNull: true,
    defaultValue: 'NA'
  },
  lineDtHr:{
    type: DataTypes.STRING(30), // 基板 ID
    allowNull: true
  }
}, {
  // tableName: 'over_defect_details',
  timestamps: true,
  // createdAt: 'created',
  // updatedAt: false
});

module.exports = OverDefectDetail;
