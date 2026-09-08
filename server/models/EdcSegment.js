const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const EdcRecord = require('./EdcRecord');

// MariaDB 把 DataTypes.JSON 實作成 longtext，mysql2 driver 不會自動把它 parse 回物件（讀回是字串）。
// 加 getter：讀取時若是字串就 parse。原生 JSON 的 MySQL 讀回本來就是物件，typeof 檢查會直接放行，兩種 DB 都安全。
function jsonGetter(field) {
  return function get() {
    const v = this.getDataValue(field);
    if (typeof v !== 'string') return v;
    try { return JSON.parse(v); } catch (_) { return v; }
  };
}

// 分段全距統計（edcAnalysis.analyzeEdcData 的輸出，一段 = 一列）
const EdcSegment = sequelize.define('EdcSegment', {
  segment_index:    { type: DataTypes.INTEGER, allowNull: false },
  recipe:           { type: DataTypes.STRING(50), allowNull: true },
  event_start:      { type: DataTypes.STRING(20), allowNull: true },
  event_end:        { type: DataTypes.STRING(20), allowNull: true },
  glass_count:      { type: DataTypes.INTEGER, defaultValue: 0 },
  boundary_reason:  { type: DataTypes.STRING(20), allowNull: true }, // start/recipe/relogin
  stats:            { type: DataTypes.JSON, allowNull: true, get: jsonGetter('stats') },       // { [column]: {min,max,avg,median,range} }
  max_range:        { type: DataTypes.FLOAT, defaultValue: 0 },
  max_range_column: { type: DataTypes.STRING(30), allowNull: true }, // 貢獻最大全距的欄位名，前端燈號旁顯示
  // 該段所有超規格欄位（全距>=rangeSpec），逗號串接、依全距由大到小排。
  // 為什麼另存一欄而不是在 listSummary 讀 stats 算：stats 是 JSON/longtext，第一層匯總要掃
  // 當天所有段，把 longtext 一起撈回來只為了算幾個欄位名太浪費（也是 Out of sort memory 的溫床）。
  // 長度上限：最多 6 shot × 8 角點 = 48 欄 × 約 16 字元 ≈ 780，取 1000 留餘裕。
  over_spec_columns: { type: DataTypes.STRING(1000), allowNull: true },
  over_spec:        { type: DataTypes.BOOLEAN, defaultValue: false }, // 燈號：false=綠(<4) / true=紅(>=4)
  // 2026-08-05 移除 `series` 欄位：逐點資料改存到 edc_glass_records（一片 glass 一列）。
  // 舊做法把 glass_id/時間戳在每個監控欄位重抄一遍，95% 的體積是重複的 id/時間/欄位名，
  // 而且 SELECT 到這個 longtext 時只要帶 ORDER BY 就會踩到 MariaDB 的 Out of sort memory。
}, {
  timestamps: true,
  tableName: 'edc_segments',
  indexes: [{ fields: ['edc_record_id'] }],
});

EdcSegment.belongsTo(EdcRecord, { foreignKey: 'edc_record_id', as: 'record', onDelete: 'CASCADE' });
EdcRecord.hasMany(EdcSegment, { foreignKey: 'edc_record_id', as: 'segments', onDelete: 'CASCADE' });

module.exports = EdcSegment;
