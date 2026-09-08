const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const EdcSegment = require('./EdcSegment');

// 段內離群 glass（三情況離群邏輯挑出的兇手基板），匯入時整批 destroy-CASCADE 重建
const EdcFlaggedGlass = sequelize.define('EdcFlaggedGlass', {
  glass_id:        { type: DataTypes.STRING(15), allowNull: false }, // SHT_ID
  event_datetime:  { type: DataTypes.STRING(20), allowNull: true },
  station:         { type: DataTypes.STRING(20), allowNull: false },
  machine:         { type: DataTypes.STRING(20), allowNull: false },
  recipe:          { type: DataTypes.STRING(50), allowNull: true },
  column_name:     { type: DataTypes.STRING(30), allowNull: false }, // 例：Shot4_Final_FLX
  value:           { type: DataTypes.FLOAT, allowNull: true },
  segment_median:  { type: DataTypes.FLOAT, allowNull: true },
  segment_range:   { type: DataTypes.FLOAT, allowNull: true },
  side:            { type: DataTypes.STRING(4), allowNull: false }, // max / min / both(退回極值法時兩筆各存 max/min)
}, {
  timestamps: true,
  tableName: 'edc_flagged_glass',
  indexes: [{ fields: ['edc_segment_id'] }],
});

EdcFlaggedGlass.belongsTo(EdcSegment, { foreignKey: 'edc_segment_id', as: 'segment', onDelete: 'CASCADE' });
EdcSegment.hasMany(EdcFlaggedGlass, { foreignKey: 'edc_segment_id', as: 'flaggedGlass', onDelete: 'CASCADE' });

module.exports = EdcFlaggedGlass;
