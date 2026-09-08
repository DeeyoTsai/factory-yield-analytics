const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// 人工資料：user 對離群 glass 的確認/註解。與 edc_flagged_glass 用「自然鍵」關聯（非 FK），
// 因為資料匯入時會 destroy-CASCADE 重建 edc_records/segments/flagged_glass，若掛 FK 會連帶被洗掉。
// 拆成獨立表 = 資料匯入永遠不碰這張表，人工註解不會因為重爬而遺失。
const EdcGlassComment = sequelize.define('EdcGlassComment', {
  day:          { type: DataTypes.DATEONLY, allowNull: false },
  station:      { type: DataTypes.STRING(20), allowNull: false },
  machine:      { type: DataTypes.STRING(20), allowNull: false },
  glass_id:     { type: DataTypes.STRING(15), allowNull: false },
  column_name:  { type: DataTypes.STRING(30), allowNull: false },
  confirmed:    { type: DataTypes.BOOLEAN, defaultValue: false },
  comment:      { type: DataTypes.TEXT, allowNull: true },
  employee:     { type: DataTypes.STRING(20), allowNull: true }, // 下 comment 的員工編號（req.user.employee）
}, {
  timestamps: true,
  tableName: 'edc_glass_comment',
  indexes: [
    { unique: true, fields: ['day', 'station', 'machine', 'glass_id', 'column_name'] },
  ],
});

module.exports = EdcGlassComment;
