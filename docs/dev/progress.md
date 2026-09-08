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
- [ ] `server/ingestion/`：`adapter.js` + `seedAdapter.js`
- [ ] `server/controllers/` + `server/routes/`（去識別化；不接 HourlyDefect/OverShoot 路由）
- [ ] `server/index.js`
- [ ] `server/seed/`：`seed.js` + fixtures
- [ ] `client/`：config / services / contexts / 核心子集元件
- [ ] `ml/`：FastAPI 骨架 + mock detector + classes.json
- [ ] 端到端跑起來 + 驗收清單（設計文件 §4.8）

## 已知延後（不在階段 1）

- `HourlyDefect` / `OverDefectDetail` model 保留（表照建），routes 不接，內容未去識別化
- ADI Analysis / 個人頁 / OverShoot 畫面
- `RgbTopFive` model 名不改（"RGB" 非識別資訊，改名 = 大 cascade）
- `HourlyDefect` 欄位前綴 `r1_/g1_...` 未改（route 未接）

## 跨 PC 續作

`cd factory-yield-analytics && git pull`，讀本檔 + 設計文件，從「進行中 / 待辦」第一個未打勾項繼續。
去識別化工具箱在私有 repo `node-fma-react/deident/`。
