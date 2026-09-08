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
- [ ] `client/`：config / services / contexts / 核心子集元件（10 畫面）
- [ ] `ml/`：FastAPI 骨架 + mock detector + classes.json
- [ ] `docs/ingestion.md`（FTP/爬蟲/直連三 pattern）
- [ ] 前端接起來截圖驗收（設計文件 §4.8）

## 已知延後（不在階段 1）

- `HourlyDefect` / `OverDefectDetail` model 保留（表照建），routes 不接，內容未去識別化
- ADI Analysis / 個人頁 / OverShoot 畫面
- `RgbTopFive` model 名不改（"RGB" 非識別資訊，改名 = 大 cascade）
- `HourlyDefect` 欄位前綴 `r1_/g1_...` 未改（route 未接）

## 跨 PC 續作

`cd factory-yield-analytics && git pull`，讀本檔 + 設計文件，從「進行中 / 待辦」第一個未打勾項繼續。
去識別化工具箱在私有 repo `node-fma-react/deident/`。
