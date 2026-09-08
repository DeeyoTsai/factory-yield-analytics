const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const UnfinishDefect = require('./UnfinishDefect');

// glass 級明細（來源系統的 glass 明細表），僅門檻入選的 defect 有明細
const UnfinishDefectDetail = sequelize.define('UnfinishDefectDetail', {
  glassid:      { type: DataTypes.STRING(15), allowNull: false },
  p_no:         { type: DataTypes.STRING(5), allowNull: true },
  defect_name:  { type: DataTypes.STRING(50), allowNull: true }, // 顯示名（與父層 defectcode 相同）
  x:            { type: DataTypes.STRING(10), allowNull: true },
  y:            { type: DataTypes.STRING(10), allowNull: true },
  defect_group: { type: DataTypes.STRING(20), allowNull: true },
  product:      { type: DataTypes.STRING(50), allowNull: true },
  tedt:         { type: DataTypes.STRING(20), allowNull: true },  // 檢驗時間 'YYYY/MM/DD HH:MM'
  img_url_1:    { type: DataTypes.STRING(255), allowNull: true }, // 外部影像伺服器的直連 URL
  img_url_2:    { type: DataTypes.STRING(255), allowNull: true },
  inspectstops: { type: DataTypes.STRING(30), allowNull: true },  // ADI入檢站別，同 daily GlassInfo.inspectstops 邏輯
  firststop:    { type: DataTypes.STRING(20), allowNull: true },  // 第一檢出站，同 daily GlassInfo.firststop 邏輯
}, { timestamps: true, tableName: 'unfinish_defect_details' });

UnfinishDefectDetail.belongsTo(UnfinishDefect, { foreignKey: 'unfinish_defect_id', as: 'defect', onDelete: 'CASCADE' });
UnfinishDefect.hasMany(UnfinishDefectDetail, { foreignKey: 'unfinish_defect_id', as: 'details', onDelete: 'CASCADE' });

module.exports = UnfinishDefectDetail;
