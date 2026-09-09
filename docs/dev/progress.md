# 階段 1 進度

設計文件：`2026-09-08-open-source-edition-design.md`

## 已完成

- [x] repo scaffold（目錄、LICENSE、.gitignore、結構型 gate + CI）
- [x] `server/config/defectTypes.js` + `client/src/config/defectTypes.js` — 12 類缺陷單一事實來源
- [x] `server/models/*`（25 個）搬移 + 去識別化
  - `fma-model.js`：24 個原缺陷欄位 → 12 個泛用欄位（由 defectTypes.js key 產生）
  - `AdiRecord` / `ReworkHis`：站別欄位 `r1..b2` → `l1..l6`（站別順序 BM1,BM2,L1..L6,AOI）
  - 註解清理（外部影像伺服器 / 資料匯入 / 來源系統，取代 EIS / 爬蟲 / *.aspx）
  - `user-model.js`：department 長度放寬 [2,20]

## 進行中 / 待辦（階段 1）

- [x] `server/config/`：`database.js`（走 env）、`passport.js`、`departments.js`、`stations.js`（+ client copy）
- [x] `server/utils/`：`employeeValidation.js`（部門 config 化）、`logger.js`
- [x] `server/middleware/auth.middleware.js`
- [x] `server/domain/`：`edcAnalysis` / `edcShift` / `edcStore` / `unfinishStore`（+ 3 個測試共 24 項全綠）
  - `__fixtures__/generateEdcSample.js` → 合成 EDC 樣本（取代真實 fixture）
  - `phaseProcess.js` 未搬（爬蟲耦合太深、內部站名多；日後趨勢線選擇功能再議）
- [x] `server/controllers/` + `server/routes/` 全部去識別化
- [x] `server/routes/auth.js`、`img-table-route.js`、`fma-table-route.js`（統計改 12 類 + 依 line）
- [x] `server/index.js`（路由掛載 / 崩潰攔截 / request log / SPA fallback）
- [x] `server/ingestion/`：`adapter.js` 契約 + `seedAdapter.js`（Daily Yield / 未結批 / EDC / 機況 / YOLO 影像）
- [x] `server/seed/`：`seed.js` + `rng.js` + `edcGen.js`；`npm run seed` 建表 + 灌 15 個工作日的假資料
- [x] `server/package.json`（移除 puppeteer/playwright/cheerio/xlsx；加 seed / test:domain script）
- [x] **server 端到端可跑**：`npm run seed` OK；`npm run dev` 啟動；API 煙霧測試（login / statistics /
  rgbtopfive / edc summary / eq-actions / unfinish / glass-info）全部回真資料
  - EDC 的 SPC 分段/離群分析在 seed 時實際跑過（站別A 全距 4.75 紅燈、其餘綠燈）
- [x] `client/`：config / services / contexts / 核心子集元件搬移 + 去識別化
  - `App.js` 收成 10 條路由；nav 移除 個人頁面 / ADI Analysis
  - `DashboardContext` / `FmaContext`：缺陷對照表改由 `config/defectTypes.js` 產生
  - `ProtectedRoute`：加 `loading` gate（修硬重整受保護頁被踢回登入的既有 bug）
  - `login-component`：加「以 Demo 帳號登入」按鈕；導向改 `/`
  - `pageFooter` / `ExternalLinksView`（改 8 條範例連結）/ `index.html` title 去識別化
  - `stationProfile.js`：STATIONS 順序 + ReworkHis 欄名 `r1..b2` → `l1..l6`
  - `client/package.json` + `.env.production`（相對 API URL）
  - **`npm run build` 通過**（只剩 ESLint warning）
- [x] `ml/`：FastAPI 骨架（`app.py`）+ `mock_detector.py` + `classes.json`（12 類）+ README
- [x] `docs/ingestion.md`（直連 DB / 爬蟲 / 檔案佇列 三 pattern + adapter 契約）
- [x] **前端接 server 端到端驗收**（設計文件 §4.8）：
  - `npm run seed` → `npm run dev`（server, PORT 8090）→ `npm run build` → 開瀏覽器
  - 10 畫面全部渲染、無 console error
  - Daily Yield 三層鑽取 ✅（Defect Map / 站別檢出分布 / Glass Details / ADI/Rework History / 趨勢圖 / Oven Slot）
  - 未結批三層鑽取 ✅、EDC 二層鑽取 ✅（by-shot 散點圖畫出分段/中位線/離群點）
  - 排程/機況甘特圖 ✅、堆疊長條圖 ✅、6 donut ✅
  - **FMA 填表畫面**：能開，但表格是舊 24 欄硬編（見下方延後）

## 階段 1 = 完成 ✅

server + client 端到端可跑的去識別化開源版本。public repo commit：`8e4002c` 為止。

## 已知延後（不在階段 1）

- **`fma-table-element.js` 的表格仍是舊 24 欄硬編 `<td>`**——FMA 填表畫面能開但表格排版未對齊
  12 類 model。完整改成 12 欄動態表格 = 「YOLO × FMA 整合」階段的工作（設計文件 §4.3 也是這樣切）
- `HourlyDefect` / `OverDefectDetail` model 保留（表照建），routes 不接，內容未去識別化
- ADI Analysis / 個人頁 / OverShoot 畫面
- `RgbTopFive` model 名不改（"RGB" 非識別資訊，改名 = 大 cascade）
- `stationProfile.js` 的 `STATION_ALIAS` / `others` 桶名（`Offline_AOI` / `Unknown` / `OC2` …）
  是通用 fallback 概念，暫留

## 跨 PC 續作

`cd factory-yield-analytics && git pull`，讀本檔 + 設計文件，從「進行中 / 待辦」第一個未打勾項繼續。
去識別化工具箱在私有 repo `node-fma-react/deident/`。
