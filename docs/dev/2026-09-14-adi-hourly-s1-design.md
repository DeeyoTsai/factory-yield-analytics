# 設計文件：ADI hourly defect 分析 — S1（資料模型 + seed + domain）

- 日期：2026-09-14
- 狀態：**待 Dave 審閱**（審過才進 writing-plans → 實作）
- 前身：私有版 `HourlyDefect` / `OverDefectDetail`（已於 2026-09-14 拆除，見 `progress.md`）

---

## 1. 目標與邊界

私有版的 ADI 畫面是把來源系統算好的圖表 script 整段快取進 DB、前端直接吃。開源版改成
**結構化數據進 DB → domain 純函式彙總 → API 出圖**，資料模型由本專案自己定義，去識別化問題自然消失。

整體切成四個子專案，各自 spec → plan → 實作：

| # | 子專案 | 依賴 | 本文件 |
|---|---|---|---|
| S1 | 資料模型（2 張表）+ 設定檔 + seed + domain 純函式 | 無 | **是** |
| S2 | ADI hourly API + 畫面（6 張圖、子視圖、爆點小時標紅） | S1 | 另開 grill |
| S3 | OverShoot 明細（點爆點小時 → 該小時爆點 glass 三站列表 + 缺陷圖） | S1 | 與 S2 合併 grill |
| S4 | 多 phase 趨勢圖、個人頁 | 獨立 | 擱置 |

S1 完成的定義：`npm run seed` 灌出兩張表、`npm run test:domain` 多一支全綠、`docs/ingestion.md` 契約更新。
**S1 不含任何 API 或前端。**

## 2. 已定案的領域規則

| 項目 | 決定 |
|---|---|
| 圖的 Y 軸「點數」 | 該小時**每片平均**缺陷點數 |
| 「Move」折線 | 該小時進該台 AOI 的 **glass 片數** |
| 爆點 | **單片** `df_sum > 100`；門檻放 `server/config/adiSpec.js`，可改 |
| 檢測模式 × 尺寸 | `RB / RW / TB / TW`（反射黑／反射白／透過黑／透過白）× `S / M / L`，**保留原名**（AOI 產業通用術語，非識別資訊） |
| `df_sum` | 恆等於 12 格總和（demo 契約，寫進 `docs/ingestion.md`） |
| AOI 機台 | `AOI-01 … AOI-06`，**`AOI-0k` 固定對應製程站 `Lk`** |
| phase | **phase 1 = L1/L2/L3（R→G→B）、phase 2 = L4/L5/L6**，宣告在 `stations.js` |
| glass 流向 | 一片只走一個 phase，依序經該 phase 三站各一次 |
| 生產日 | **08:00 起算**到隔天 07:59；X 軸順序 `08…23, 00…07`。`hour` 0–7 的自然日 = `prod_date + 1` |
| 爆點旗標 | **不存**，查詢時由 domain 用門檻判 |
| 與 `GlassInfo` 關聯 | **不做**（目的不同）；只保證 gid 格式一致 |

## 3. 資料模型

只存圖表與明細直接要的東西，不存逐片全量事實表。

### 3.1 `AoiHourlyStat`（表 `aoi_hourly_stats`）— 一列 = (aoi, prod_date, hour)

| 欄位 | 型別 | 說明 |
|---|---|---|
| `aoi` | STRING(10) | `AOI-01`…`AOI-06` |
| `station` | STRING(5) | `L1`…`L6`（= `AOI_STATION_MAP[aoi]`，冗餘存以便查詢） |
| `phase` | TINYINT | 1 / 2 |
| `prod_date` | DATEONLY | 生產日 |
| `hour` | TINYINT | 0–23 |
| `glass_count` | INTEGER | Move 折線 |
| `avg_rb_s` … `avg_tw_l` | FLOAT × 12 | 每片平均，順序 `rb_s, rb_m, rb_l, rw_s, rw_m, rw_l, tb_s, tb_m, tb_l, tw_s, tw_m, tw_l` |

- unique index `(aoi, prod_date, hour)`
- `timestamps: true`（同 `EdcRecord` / `TrendChart` 慣例）
- 資料量：6 × 24 × 15 天 ≈ 2,160 列
- 總覽的「點數」= Σ12 個 avg；子視圖各取所需——**都在 domain 算，不另存欄位**

### 3.2 `AoiOverGlass`（表 `aoi_over_glasses`）— 一列 = 爆點 glass 在其 phase 的**一站**

| 欄位 | 型別 | 說明 |
|---|---|---|
| `gid` | STRING(20) | `GL-YYMMDD-NNNN`（4 位流水，一天可到 9,999 片） |
| `aoi` / `station` / `phase` | 同上 | |
| `prod_date` | DATEONLY | 生產日 |
| `hour` | TINYINT | 0–23（該站檢測時刻所屬的小時） |
| `dt` | DATE | 該站檢測時刻 |
| `product` | STRING(20) | `PNL-A140 / PNL-B156 / PNL-C238` |
| `rb_s` … `tw_l` | INTEGER × 12 | 該站實際點數 |
| `df_sum` | INTEGER | = Σ12 |
| `map_path` | STRING(255) | 缺陷圖（`/demo-defects/ad_<gid>_<station>.svg`），可為 null |

- 一片爆點 glass **三站各一列**（`dt` 遞增、R→G→B），至少一列 `df_sum > 門檻`；
  前端 group by `gid` 後每站一列，即私有版 `OverDefectDetailTable` 的「完整清單」
- index `(aoi, prod_date, hour)`、index `(gid)`
- 資料量：每天約 20–60 片 × 3 列
- 「爆點小時」= 該 (aoi, prod_date, hour) 存在 `df_sum > 門檻` 的列 → **查詢時算**

## 4. 設定檔

### 4.1 `server/config/stations.js`（client 同步一份）新增

```js
// AOI 機台 ↔ 製程站，固定一對一
const AOI_STATION_MAP = {
  "AOI-01": "L1", "AOI-02": "L2", "AOI-03": "L3",
  "AOI-04": "L4", "AOI-05": "L5", "AOI-06": "L6",
};
// 一片 glass 只走一個 phase，依序經三站（R → G → B）
const PHASES = { 1: ["L1", "L2", "L3"], 2: ["L4", "L5", "L6"] };
```

既有 `stationProfile.js` 的抽檢站集合 `{L1,L2,L4,L5}` 在此對應下不變，不動。

### 4.2 `server/config/adiSpec.js`（新檔）

```js
// 單片 df_sum 超過即為「爆點」；改門檻不用重灌 seed
const OVER_POINT_THRESHOLD = 100;
// 檢測模式 × 尺寸，順序即 12 欄的順序
const AOI_MODES = ["rb", "rw", "tb", "tw"];
const AOI_SIZES = ["s", "m", "l"];
const AOI_COLUMNS = AOI_MODES.flatMap((m) => AOI_SIZES.map((s) => `${m}_${s}`));
// 生產日 08:00 起算；X 軸順序
const PROD_DAY_START_HOUR = 8;
const HOUR_ORDER = [...Array(16).keys()].map((i) => i + 8).concat([...Array(8).keys()]); // 8..23, 0..7
```

## 5. domain 純函式：`server/domain/adiAnalysis.js`

```js
/**
 * @param {AoiHourlyStat[]} statRows  某台 AOI 某生產日的 24 列（可缺列，缺的補 0）
 * @param {AoiOverGlass[]}  overRows  同 (aoi, prod_date) 的爆點列
 * @param {number}          threshold 預設 OVER_POINT_THRESHOLD
 * @returns {{
 *   hours: string[],            // ['08', … '23', '00', … '07']
 *   glassCount: number[],       // Move
 *   avgTotal: number[],         // 總覽點數 = Σ12
 *   avgByMode: { rb: number[], rw: number[], tb: number[], tw: number[] },
 *   avgBySize: { s: number[], m: number[], l: number[] },
 *   overHours: string[],        // 有 df_sum > threshold 的小時（字串，同 hours 格式）
 *   overCountByHour: Record<string, number>, // 該小時爆點 glass 數（distinct gid）
 * }}
 */
function buildHourlySeries(statRows, overRows, threshold = OVER_POINT_THRESHOLD)
```

- 純函式、無 IO，`node:test`（`adiAnalysis.test.js`）至少涵蓋：24 小時順序、缺列補 0、
  Σ12 = avgTotal、mode/size 加總正確、overHours 只含超門檻小時、同 gid 三站只算一片
- 不做任何 DB 查詢；controller（S2）負責撈兩張表丟進來
- 不在前端做加總

## 6. seed（`server/ingestion/seedAdapter.js` 新增 `seedAoiHourly(day, seedBase)`）

沿用既有 `makeRng(seedBase)` 保證可重現；`bulkCreate` 寫入。15 個工作日全灌（與其他資料同時間軸）。

### 6.1 片數（Move）

- 每 phase 每小時基準 **40–80 片**，夜班（hour 0–7）× 0.7–0.85
- 同 phase 三台 AOI 同一小時**共用基準 + 各自 ±10% 抖動**（看起來像同一批 glass 流過三站）

### 6.2 平均點數（故事）

- 基準每片 **15–40 點**，12 格依固定比重分配：模式 `rb 40% / rw 20% / tb 15% / tw 25%`、
  尺寸 `s 60% / m 30% / l 10%`，各格再加 ±20% 雜訊
- 每生產日 rng 挑 **1–2 台 AOI**、**連續 2–3 小時**把基準拉到 **60–90 點**（異常區段）
- 12 個 avg 欄位 = 該小時「模擬片群」的平均（不需真的產生逐片，直接算平均值 + 雜訊）

### 6.3 爆點 glass

- 異常區段每小時 **2–5 片**、其他小時 **0–1 片**（整體約 1–3%）
- 每片產三列（該 phase 三站，`dt` 遞增 5–20 分鐘、跨小時時 `hour` 跟著變）；
  **爆點那一站的 `hour` 必須落在該台 AOI 的異常區段或指定小時**，圖上標紅的小時才會跟拉高的平均對得上；
  爆點站的 12 格總和落在 **101–260**，其餘兩站 20–80；`df_sum = Σ12` 由程式算、不手填
- gid `GL-YYMMDD-NNNN`；product 隨機取 `PRODUCTS`
- 缺陷圖：**只替爆點那一站列**用既有 `renderPair(gid, idx, rng, types, "ad_")` 產 SVG，取 `.pred`
  存 `map_path`；其餘兩站 `map_path = null`

### 6.4 一致性檢查（seed 結束時 console 印）

- 每台 AOI 每生產日 24 列齊
- 爆點 glass 三列 phase 一致、station 依 `PHASES` 順序
- 抽一天印：「AOI-0x 異常區段 hh–hh、爆點 n 片」供肉眼驗

## 7. 文件更新

- `docs/ingestion.md`「欄位單位與格式」加三列：`aoi_hourly_stats.avg_*` 為每片平均、
  `aoi_over_glasses.df_sum = Σ12`、`prod_date/hour` 的 08:00 生產日規則
- `docs/dev/progress.md` 記錄 S1 完成
- README「Roadmap」段 ADI 一項改成「S1 完成、S2/S3 進行中」

## 8. 動到的檔案

| 檔案 | 動作 |
|---|---|
| `server/config/stations.js`、`client/src/config/stations.js` | 加 `AOI_STATION_MAP`、`PHASES` |
| `server/config/adiSpec.js` | 新增 |
| `server/models/AoiHourlyStat.js`、`AoiOverGlass.js` | 新增 |
| `server/models/index.js` | 註冊兩個 model |
| `server/domain/adiAnalysis.js`、`adiAnalysis.test.js` | 新增 |
| `server/package.json` | `test:domain` 加一支 |
| `server/ingestion/seedAdapter.js` | 加 `seedAoiHourly`，`run()` 呼叫 |
| `docs/ingestion.md`、`docs/dev/progress.md`、`README.md` | 契約 / 紀錄 / roadmap |

## 9. 明確不做（YAGNI）

- 逐片全量事實表
- `is_over` 旗標、`rb_sum` 等小計欄位
- 與 `GlassInfo` / `AdiRecord` 的關聯
- API、前端（S2/S3）
- 多 phase 趨勢圖、個人頁（S4）
