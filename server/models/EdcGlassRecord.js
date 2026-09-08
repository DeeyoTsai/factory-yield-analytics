const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const EdcRecord = require('./EdcRecord');
const EdcSegment = require('./EdcSegment');

/**
 * 每一片 glass 的原始量測值（一片 = 一列），取代原本塞在 `edc_segments.series` 的 JSON。
 *
 * 為什麼改成真欄位表（2026-08-05 改版）：
 * 原本 series 的形狀是 `{ [欄位]: [{glass_id, event_datetime, value}, ...] }`，同一片 glass
 * 在每個監控欄位的陣列裡各出現一次 —— 8 個角點就把 glass_id 與時間戳重抄 8 遍，實測單點 78 bytes
 * 裡真正的數值只有 4 bytes，其餘 95% 都是重複的 id／時間／欄位名。改成真欄位後欄位名只存在
 * schema 裡一次，體積反而比原本只存部分欄位的 series 小很多，而且可以直接下 SQL 查單片 glass
 * （`WHERE glass_id=...`）或跨天撈某欄位（`WHERE Shot3_Final_FRY > 8`），這是 JSON 做不到的。
 *
 * 欄位取捨（Dave 2026-08-05 決定，未取用的欄位直接不落地，需要時再改資料匯入補）：
 * - 表頭只留識別與分析真的會用到的：glass_id / lot_id / event_datetime / station / machine /
 *   recipe / process_complete
 * - 刪掉整批固定值或全空白的（TRX_ID/TYPE_ID/REP_UNIT/MES_ID/PPBOX_ID/RETICLE_ID）、
 *   跟 edc_records 重複的（USER_ID/EQPT_UNIT_ID）、父欄位已刪而失去意義的（ROUTE_VER/OPE_VER/
 *   OPE_NO）、內部計數（DATA_CNT/RECIPE_NO）、以及 T_STAMP/GLASS_DATA/CRR_ID/SLOT_NO/
 *   STAGE_ID/OPE_ID/ROUTE_ID/ORIG_OPI_FLG/INTL_CHK_FLG/AC_RECIPE_ID
 * - 每個 shot 只留「四角點 8 欄 + Expose」，其餘（Gap_FR/FL/RL/RR、GAP_RETRY、PA_Retry、
 *   FINAL_PA1~3、ALIGNMENT、Final_Align_X/Y/T）全刪。**注意 Final_Align_T 也刪了**，
 *   所以監控欄位同步從 9 欄縮成 8 個角點（見 edcAnalysis.js 的 MONITOR_COLUMN_RE）。
 *
 * 欄位名刻意跟 來源系統的原始欄名一字不差（`Shot3_Final_FRY`、`Shot3_Expose`），這樣
 * edcAnalysis 用 regex 推導出來的監控欄位名可以直接當 DB 欄位名用，不用再維護一份對照表。
 */

// 四角點順序跟前端 Shot 檢視的排列一致（EdcColumnTrendChart.jsx 的 SHOT_VIEW_COLUMNS）
const CORNER_SUFFIXES = ['FRX', 'FRY', 'FLX', 'FLY', 'RLX', 'RLY', 'RRX', 'RRY'];
// 來源系統固定給到 Shot6（實際用到幾個 shot 隨品種變動，沒用到的 shot 整欄是 0 → 這裡存 null）
const MAX_SHOTS = 6;

function shotColumns() {
  const cols = {};
  for (let s = 1; s <= MAX_SHOTS; s += 1) {
    for (const suffix of CORNER_SUFFIXES) {
      cols[`Shot${s}_Final_${suffix}`] = { type: DataTypes.FLOAT, allowNull: true };
    }
    cols[`Shot${s}_Expose`] = { type: DataTypes.FLOAT, allowNull: true };
  }
  return cols;
}

const EdcGlassRecord = sequelize.define('EdcGlassRecord', {
  glass_id:         { type: DataTypes.STRING(30), allowNull: true },  // SHT_ID
  lot_id:           { type: DataTypes.STRING(30), allowNull: true },  // SGR_ID
  event_datetime:   { type: DataTypes.STRING(20), allowNull: true },  // 同其餘 EDC 表：存格式化字串，與 edc_segments.event_start 一致
  // station/machine/recipe 跟 edc_records/edc_segments 重複，但比照既有 edc_flagged_glass 的做法
  // 冗餘存一份——這張表最常見的用途就是「直接查單片 glass」，不希望每次都得 join 兩層
  station:          { type: DataTypes.STRING(10), allowNull: true },
  machine:          { type: DataTypes.STRING(10), allowNull: true },
  recipe:           { type: DataTypes.STRING(50), allowNull: true },  // recipe_id
  process_complete: { type: DataTypes.STRING(10), allowNull: true },  // 未曝光的片是 '0000'
  ...shotColumns(),
}, {
  timestamps: true,
  tableName: 'edc_glass_records',
  indexes: [
    { fields: ['edc_segment_id'] },            // 第二層畫圖：依段撈整段序列
    { fields: ['glass_id'] },                  // 查單片 glass 的歷史
    { fields: ['station', 'event_datetime'] }, // 跨天查某站別某時段
  ],
});

EdcGlassRecord.belongsTo(EdcRecord, { foreignKey: 'edc_record_id', as: 'record', onDelete: 'CASCADE' });
EdcRecord.hasMany(EdcGlassRecord, { foreignKey: 'edc_record_id', as: 'glassRecords', onDelete: 'CASCADE' });
EdcGlassRecord.belongsTo(EdcSegment, { foreignKey: 'edc_segment_id', as: 'segment', onDelete: 'CASCADE' });
EdcSegment.hasMany(EdcGlassRecord, { foreignKey: 'edc_segment_id', as: 'glassRecords', onDelete: 'CASCADE' });

module.exports = EdcGlassRecord;
module.exports.CORNER_SUFFIXES = CORNER_SUFFIXES;
module.exports.MAX_SHOTS = MAX_SHOTS;
