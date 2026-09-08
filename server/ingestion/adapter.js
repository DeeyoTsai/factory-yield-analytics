/**
 * Ingestion adapter 契約
 * ======================
 *
 * 這個開源版**沒有內建對外爬蟲**。良率／機況／EDC／YOLO 影像等資料，
 * 由一個「ingestion adapter」負責從你的來源拉進來、正規化、寫入 DB。
 *
 * 內建的 `seedAdapter.js` 產生一份合成假資料，讓 `npm run seed` 後每個畫面都有東西看。
 * 要接自己的資料流（爬蟲 / 直連另一個 DB 的 view / CSV 匯入 / 訊息佇列 …），
 * 就實作一個符合下面契約的模組，換掉 seed.js 裡對 seedAdapter 的呼叫。
 *
 * @typedef {Object} IngestionAdapter
 * @property {(opts?: { day?: string }) => Promise<IngestionResult>} run
 *   拉資料 → 正規化 → 寫入。`day` 省略時由 adapter 自行決定範圍（例如「今天」或「最近 N 天」）。
 *
 * @typedef {Object} IngestionResult
 * @property {number} [dailyYield]     寫入的 Daily Yield 記錄數
 * @property {number} [unfinishLots]   寫入的未結批 lot 數
 * @property {number} [edcRecords]     寫入的 EDC record 數
 * @property {number} [eqActions]      寫入的機況 record 數
 * @property {number} [images]         寫入的 YOLO 影像 record 數
 *
 * 寫入時建議透過既有的 domain 寫入層以維持一致的 destroy-rebuild 語意：
 *   - `domain/edcStore.js`  → `replaceEdcRecord()`
 *   - `domain/unfinishStore.js` → `replaceUnfinishLot()`
 *   其餘表（RgbTopFive / EqAction / GlassInfo …）直接用 Sequelize model。
 *
 * 更完整的三種串接 pattern 說明見 docs/ingestion.md。
 */

module.exports = {};
