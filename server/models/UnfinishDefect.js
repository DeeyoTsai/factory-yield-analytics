const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const UnfinishLot = require('./UnfinishLot');
const TrendChart = require('./TrendChart');

// 未結批 lot 的 defect code 統計（來源系統的 defect 統計表）
const UnfinishDefect = sequelize.define('UnfinishDefect', {
  process:     { type: DataTypes.STRING(10), allowNull: true },
  defectcode:  { type: DataTypes.STRING(50), allowNull: false }, // 顯示名，如 DF-03
  qty:         { type: DataTypes.INTEGER, defaultValue: 0 },
  detail_code: { type: DataTypes.STRING(20), allowNull: true },  // 明細連結用的來源系統內部碼
  product:     { type: DataTypes.STRING(50), allowNull: true },
}, { timestamps: true, tableName: 'unfinish_defects' });

UnfinishDefect.belongsTo(UnfinishLot, { foreignKey: 'unfinishlot_id', as: 'lot', onDelete: 'CASCADE' });
UnfinishLot.hasMany(UnfinishDefect, { foreignKey: 'unfinishlot_id', as: 'defects', onDelete: 'CASCADE' });

// trend_charts 雙軌：daily 掛 rgbtopfive_id、未結批掛 unfinish_defect_id
TrendChart.belongsTo(UnfinishDefect, { foreignKey: 'unfinish_defect_id', as: 'unfinishdefect', onDelete: 'CASCADE' });
UnfinishDefect.hasOne(TrendChart, { foreignKey: 'unfinish_defect_id', as: 'trendchart', onDelete: 'CASCADE' });

module.exports = UnfinishDefect;
