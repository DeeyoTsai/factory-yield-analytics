const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// EDC alignment 全距監控表頭：一列 = 某 站別×機台×班別（或自訂區間）的彙總（匯入時整批 destroy-CASCADE 重建）
const EdcRecord = sequelize.define('EdcRecord', {
  day:            { type: DataTypes.DATEONLY, allowNull: false },
  station:        { type: DataTypes.STRING(20), allowNull: false }, // 站別A/站別C/站別E/站別B/站別D/站別F
  machine:        { type: DataTypes.STRING(20), allowNull: false }, // 機台M01~06
  // 'day'/'night'＝排程每3小時觸發、卡在單一班別內；'custom'＝網頁手動指定任意起訖時間，整批不拆班別。
  // 夜班的 day 欄位＝夜班開始那天（例：8/3 19:00~8/4 04:00 存 day=8/3, shift=night）。
  shift:          { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'day' },
  // 只有 shift='custom' 會用到：存使用者實際輸入的查詢起訖時間，作為 identity 一部分——
  // 同一段自訂範圍重查＝覆蓋同一筆，不同範圍＝各自獨立一筆，不會互相刪除。day/night 這兩欄維持 NULL。
  window_start:   { type: DataTypes.STRING(20), allowNull: true },
  window_end:     { type: DataTypes.STRING(20), allowNull: true },
  segment_count:  { type: DataTypes.INTEGER, defaultValue: 0 },
  max_range:      { type: DataTypes.FLOAT, defaultValue: 0 },       // 當天所有段落中的最大全距
  over_spec:      { type: DataTypes.BOOLEAN, defaultValue: false },
  event_start:    { type: DataTypes.STRING(20), allowNull: true },
  event_end:      { type: DataTypes.STRING(20), allowNull: true },
}, {
  timestamps: true,
  tableName: 'edc_records',
  // 兩支 API 都以 day 起手（listSummary 撈整天、getGroupFlagged 再加 station+shift），
  // 保留天數拉長到 60 天後這張表約 1000+ 列，有 index 才不會每次全表掃
  indexes: [{ fields: ['day'] }, { fields: ['day', 'station', 'shift'] }],
});

module.exports = EdcRecord;
