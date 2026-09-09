# 資料匯入（Ingestion）

這個開源版**不含對外爬蟲**。FMA 表單資料是使用者在網頁上直接填的；
良率 / 機況 / EDC / YOLO 影像等資料則由一個 **ingestion adapter** 從你的來源拉進來。

- 內建的 `server/ingestion/seedAdapter.js` 產生一份合成假資料（`npm run seed` 會呼叫它），
  讓每個畫面 clone 下來就有東西看。
- 要接自己場域的資料，實作一個符合 `server/ingestion/adapter.js` 契約的模組，
  換掉 `server/seed/seed.js` 裡對 seedAdapter 的呼叫，或另外寫一支排程腳本定時執行。

---

## Adapter 契約

```js
/**
 * @typedef {Object} IngestionAdapter
 * @property {(opts?: { day?: string }) => Promise<IngestionResult>} run
 */
```

`run()` 負責：**拉來源資料 → 正規化成 model 的欄位形狀 → 寫入 DB**。

寫入時建議走既有的 domain 寫入層，維持一致的「整批 destroy-rebuild」語意：

| 資料 | 寫入層 |
|---|---|
| EDC 全距監控 | `server/domain/edcStore.js` 的 `replaceEdcRecord()` |
| 未結批良率 | `server/domain/unfinishStore.js` 的 `replaceUnfinishLot()` |
| Daily Yield / 機況 / 影像 | 直接用 `server/models` 的 Sequelize model |

EDC 的分段 / 全距 / 離群分析是純函式（`server/domain/edcAnalysis.js` 的
`analyzeEdcData(rows)`），把你的原始逐片量測列丟進去就會得到 `replaceEdcRecord()`
需要的 `segments`——不用自己重寫 SPC 邏輯。

---

## 三種常見的串接 pattern

### 1. 直連來源資料庫（最單純）

如果你的 MES / 檢測系統本來就有資料庫，通常最省事的是**開一個唯讀連線**，
在 adapter 裡下 SQL 把當天資料撈出來、map 成 model 欄位、呼叫寫入層。
不需要爬蟲，也不需要中介檔案。

```js
// server/ingestion/myAdapter.js（示意）
const mysql = require("mysql2/promise");
const { replaceEdcRecord } = require("../domain/edcStore");
const { analyzeEdcData } = require("../domain/edcAnalysis");

async function run({ day } = {}) {
  const src = await mysql.createConnection(process.env.SOURCE_DB_URL);
  const [rows] = await src.query(
    "SELECT ... FROM aligner_measurement WHERE DATE(event_datetime) = ?", [day]
  );
  // rows -> { glass_id, event_datetime: Date, recipe, Shot1_Final_FRX, ... }
  const byStation = groupBy(rows, "station");
  for (const [station, stationRows] of Object.entries(byStation)) {
    const segments = analyzeEdcData(stationRows.map(normalize));
    await replaceEdcRecord({ day, shift: "day", station, machine: pair(station), segments,
      windowStart: startOfDay(day), windowEnd: endOfDay(day) });
  }
  await src.end();
  return { edcRecords: Object.keys(byStation).length };
}
module.exports = { run };
```

### 2. 網頁爬蟲

如果來源只有網頁（ASP.NET GridView、報表頁…），adapter 內部用
`axios` + `cheerio` 模擬表單 / postback 抓 HTML，再 parse 成 model 欄位。
本專案刻意不附這類程式碼——不同系統的頁面結構差太多，而且常牽涉內部驗證
（NTLM / SSO）與 proxy。原理跟 pattern 1 一樣，只是「拉資料」那步換成 HTTP 抓頁面。

### 3. 檔案 / 訊息佇列匯入

來源是每天丟一份 CSV / Excel / JSON 到共享資料夾或 FTP，或推到 Kafka / MQTT。
adapter 監看目錄 / 訂閱 topic，收到就 parse → 正規化 → 寫入。
FTP 資料交換屬於這一類——本專案只描述概念，不附 FTP client 程式碼。

---

## YOLO 影像

`imagetb` 表存每張 defect 影像的原圖 / 預測圖路徑 + `pred_result`（detector 回傳的
JSON）+ 人工複判。ingestion adapter 負責把影像路徑與 detector 結果寫進這張表；
detector 本身見 [`../ml/README.md`](../ml/README.md)。

`pred_result` 格式：

```json
{ "detections": [ { "class": "刮傷", "confidence": 0.92, "bbox": [x, y, w, h] } ] }
```

`class` 用 `server/config/defectTypes.js` 的 `yolo` 欄位值。前端 FMA 表單會把
第一筆 detection 對照到對應的缺陷欄位、預填進表格。
