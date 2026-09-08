const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const RgbTopFive = require('./RgbTopFive');

// MariaDB 把 DataTypes.JSON 實作成 longtext，mysql2 driver 不會自動把它 parse 回物件（讀回是字串），
// 前端會拿到字串而非陣列而爆掉。加 getter：讀取時若是字串就 parse；原生 JSON 的 MySQL 讀回本來就是
// 物件，typeof 檢查直接放行，兩種 DB 都安全。（同 EdcSegment.js；凡 JSON 欄位都要比照加。）
function jsonGetter(field) {
  return function get() {
    const v = this.getDataValue(field);
    if (typeof v !== 'string') return v;
    try { return JSON.parse(v); } catch (_) { return v; }
  };
}

const TrendChart = sequelize.define('TrendChart', {
  dfcode: {
    type: DataTypes.STRING(30),
    allowNull: false,
  },
  day: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  process: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  tool_id: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  // x 軸時間標籤，不含最後加總欄，例：['08:00','09:00',...,'18:00']
  hours: {
    type: DataTypes.JSON,
    allowNull: true,
    get: jsonGetter('hours'),
  },
  output: {
    type: DataTypes.JSON,
    allowNull: true,
    get: jsonGetter('output'),
  },
  input: {
    type: DataTypes.JSON,
    allowNull: true,
    get: jsonGetter('input'),
  },
  defect_qty: {
    type: DataTypes.JSON,
    allowNull: true,
    get: jsonGetter('defect_qty'),
  },
  defect_ratio: {
    type: DataTypes.JSON,
    allowNull: true,
    get: jsonGetter('defect_ratio'),
  },
  // 最後加總欄：{ output, input, defect_qty, defect_ratio }
  total: {
    type: DataTypes.JSON,
    allowNull: true,
    get: jsonGetter('total'),
  },
}, {
  timestamps: true,
});

TrendChart.belongsTo(RgbTopFive, { foreignKey: 'rgbtopfive_id', as: 'rgbtopfive', onDelete: 'CASCADE' });
// hasMany（不是 hasOne）：同一個 defect 若兩條線（phase 1/2）都有發生，每條線各存一筆
// 趨勢資料。FK 早就在，改這行不需要 schema migration。
RgbTopFive.hasMany(TrendChart, { foreignKey: 'rgbtopfive_id', as: 'trendcharts', onDelete: 'CASCADE' });

module.exports = TrendChart;
