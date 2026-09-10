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

---

# 階段 2 進度 — YOLO × Defect FMA 整合

grill 決策：(1) FMA 表格改乾淨的受控 React 表單（非 contenteditable）
(2) `pred_result` 契約定死 `{ detections: [{class, confidence, bbox}] }`，`class` 用
`defectTypes.js` 的 `yolo` 欄位 (3) 所有子功能保留（Total/Avg/百分比/累計列、新增欄位、
DragDropImageTable、AG-Grid YOLO 複判、FMA echart）(4) demo 不需跑 Python，
另加 `server/ingestion/detector.js` + 接真 YOLO 文件。

## 已完成

- [x] `client/src/components/elements/fma-table-element.js` — 1117 行 contenteditable
  24 欄表格 → ~250 行受控 12 欄表單。`emptyRow()` / `rows` state / setCell /
  自訂欄 / YOLO `predictMap` 預填（該列未手動填才套用）/ smlMap S/M/L / 表尾統計
- [x] `input-form-element.js` — `oriDbDefect = DEFECT_KEYS`；`glassRows` /
  `customColNames` state；`handleSubmitBtnEvent` 改由 `glassRows` 組 payload；
  `<FmaTableElement>` / `<DefectTableElement>` props 對齊（傳 `glassRows` / `line`）
- [x] `defect-table-element.js` — `pred_result` valueGetter 改讀 `{detections:[...]}`；
  `handleGetData`（讀 DOM）→ `fetchImages()`（用 parent 傳的 `glassRows`/`glassDataSet`）；
  `buildPredictMap()`：每張影像第一筆 detection 經 `yolo -> key` 統計成
  `{ gid: { <欄位>: 次數 } }`；查詢/編輯頁 `glassDataSet` 一到自動 fetch
- [x] `query-result-component.js` — 24 key `numericFields` → `[...DEFECT_KEYS, s, m, l, sqlId]`
- [x] `fma-echart-element.js` — 移除寫死的舊 24 key `transDefect`，直接用 `defectArr`（已是 12 類中文名）
- [x] `server/routes/img-table-route.js` — `queryByGlasses` 的 `line` 篩選改成選配
  （沒帶 line 就只用 gid 比對，方便 demo）
- [x] `server/ingestion/seedAdapter.js` `seedImages()` + `server/seed/seed.js` —
  gid 帶 line 傳進來，`imagetb.line` 對齊 FMA outline 產線
- [x] `server/ingestion/detector.js`（新）— server 端呼叫 YOLO 的薄封裝：
  設 `DETECTOR_URL` 就 POST 影像（多部分），沒設用內建 mock（影像位元組雜湊 → 穩定假 detection）。
  回傳 `{ detector, detections, pred_result }`
- [x] `docs/ingestion.md` — 補「YOLO 影像 → FMA 表格預填」端到端流程 + 「接真的 YOLO」段
- [x] `defect-table-element.js` 時間欄 valueGetter 容錯（緊湊 14 碼 / 一般日期字串皆可）
- [x] `seed.js` outline comment 改用 FMA「調查結果整理」可解析格式（查詢/編輯頁還原前三大 defect + 對策）
- [x] `img-table-route.js` `queryByGlasses` items 單筆時強制轉陣列（避免 `Op.in` 爆掉）
- [x] `npm run seed` OK（YOLO 影像 x92，line 對齊）、`npm run test:domain` 9+8+7 綠、兩道去識別化 gate 綠
- [x] `npm run build` 通過（只剩既有 ESLint warning）
- [x] 瀏覽器實測（headless chromium）：
  - 新增 FMA 填表 → 選 L1 → 輸入 seed glass id → Refresh：
    `film_thickness` 影像 → 「膜厚異常」欄自動填 1；`particle` → 「異物」欄填 1；
    AG-Grid「Predict Defect」欄顯示 膜厚異常 / 異物；無 console error
  - 查詢頁 → 開第一筆 → 12 欄表格帶出既有值、FMA Chart 12 類、前三大代表圖、
    Comments 正確還原、DefectTableElement 自動載入影像（多 detection 逗號串接）、
    時間欄顯示正常（無 Invalid Date）

### 表格版面（比照私有版）

- [x] 表格寬度貼齊瀏覽器：`.fma-cell-input` 原本沒有寬度規則，瀏覽器給每個 input 預設 ~150px，
  19 欄撐到 ~2500px。加 `width:100%` + `table-layout:fixed` + `<colgroup>` 固定非缺陷欄寬，
  缺陷欄平分剩餘（1440/1280/1024 三種寬度溢出皆 0px）
- [x] 表尾欄數對齊：`colLabels` 原本只算「已命名的自訂欄」（`customColNames.slice(0, numCustom)`），
  按「新增欄位」但還沒命名時長度少 1 → 表尾四列各少一個 `<td>` 而錯位。改成一律照 `numCustom` 長度
- [x] **表尾 Avg Num / 百分比(%) 被圖表就地竄改**：`fma-echart-element.js` 的 `sortDefect()` 直接
  `.sort()` / `.splice()` props，而那兩個陣列就是表格 `stats.avgs` / `stats.ratios` 的**同一個參考**
  → 填入數字後兩列被排序＋截短（12 格變 3 格）。改成純函式 `computeSorted()` 在複本上操作；
  表格端也改傳複本。連帶新增 `sortedRatios` 一條線（outline 前三大 % 與對策文字原本是「靠這個副作用」
  才拿到排序後的 ratio），`input-form-element` / `query-result-component` / `fma-textarea-element` 同步改
- [x] 表頭比照私有版：`Sheet Data` 群組表頭（colSpan=4）取代 S/M/L/單枚總和 下方的 4 個空白格；
  `FMA Total` 上下兩層（下層 `單枚總和`）；**垃圾桶欄不給表頭**（寬度由 colgroup `col-trash` 決定）；
  tfoot 三列到 FMA Total 就結束，Sheet Data／垃圾桶區留白不畫框

### Demo 資料與影像

- [x] `server/seed/defectImages.js`（新）—— **合成瑕疵影像產生器（SVG，零外部依賴）**。
  12 類各有專屬畫法（刮傷=細亮線、異物=亮塊+光暈、氣泡=環+高光、破損=碎裂多邊形、崩缺=邊緣缺角、
  膜厚異常=漸層帶、顯影不良=斑點區、色不均=大面積色偏…），底圖為深色玻璃基板+掃描線+暗角。
  預測圖畫綠色 bbox + `class conf` 標籤，**座標與 `pred_result` JSON 完全一致**。
  產在 `client/media/demo-defects/`（`.gitignore` 已排除，`npm run seed` 時生成，repo 不變胖）。
  取代原本指向 `picsum.photos` 的隨機風景照 —— 離線 clone 也能跑，且真的像檢測影像
- [x] `seedImages()`：每片 glass 2~4 張影像（拖拉圖片庫才有東西），25% 機率單張含 2 個 detection
  （展示 `pred_result` 可含多筆）
- [x] `ShtSmlCount` 納入 seed（之前完全沒灌 → Refresh 不會帶 S/M/L），`ln` 用 `AOI-0N` 對應產線
- [x] `GET /api/imgtable/demoGlasses`（新）+ FMA 表單「示範資料 → 帶入 N 筆（Lx）」提示列：
  一鍵帶入有影像的 Glass ID 並連動產線，否則使用者不知道要輸入什麼。
  **後端把這支刪掉前端會自動不顯示**，接自己資料流時可直接移除
- [x] `queryByGlasses` 多回傳 `lot`；品名查詢改優先用影像記錄自己的 `lot`，
  「gid 前 7 碼即 lot」只當 fallback（不同場域 glass id 編碼規則不一定相同）
- [x] `querySmlByLineGls` 的 `Op.in` 單筆字串問題（與 `queryByGlasses` 同一個坑）
- [x] 產線 `<select>` 改受控（否則一鍵帶入時下拉不會連動）

## 階段 2 = 完成 ✅

## 從私有版同步的更新（2026-09-10）

私有 repo `node-fma-react` 當天的兩個 EDC commit，已移植到公開版：

- **`df6dc59` 散點圖 dataZoom + 修每 4 秒重置**（`EdcColumnTrendChart.jsx` / `EdcRangeView.jsx`）
  - `buildOption` 加 `dataZoom`（inside 滾輪 + slider 細滑桿，`filterMode:'none'`——只縮視窗不抽資料，
    markLine/markPoint 的 category index 座標才不會位移）
  - **修 bug**：dataZoom 範圍每 4 秒被打回全範圍、畫面閃爍。根因是 `buildOption` 內含 inline formatter
    函式，父層 `EdcRangeView` 每 4 秒輪詢狀態觸發 re-render → echarts-for-react 以 deep-equal 比對
    option（函式比參考、必不相等）→ 每次都重新 `setOption(notMerge)`。改用 `useMemo(optionByColumn)` 快取
  - `grid.bottom` 8→30、圖高 200→260 容納滑桿；版面改一排 2 張（`col-12 col-md-6`）
- **`46df67c` 離群候選端加「管制線」T 過濾 + 保底一枚**（`domain/edcAnalysis.js` / `domain/edcOutlier.test.js`）
  - `analyzeSegment()` 在既有三分支產生「候選端」後，多一道過濾：只留該端自己 `h > T` 的候選
    ——全距達標但分布其實很平均時，貼著管制線的極值不算異常、不標紅，避免圖上出現「紅點落在管制線內」
  - 保底：過濾後若一端都不剩，退回標 `h` 較大那一端一枚（tie 取 max），維持
    「超規格欄位必定挑得出至少一個兇手」這個下游依賴的不變量
  - 測試 8 → 9 項（改寫 2 項「退回兩端都取」為「保底一枚」、新增「closeness 但只有一端超 T」）

**移植時的去識別化調整**：新註解裡的「EDC 爬蟲整批重建」→ `ingestion adapter 整批重建`、
`**爬蟲永不觸碰**` → `**匯入流程永不觸碰**`、移除私有 repo 的歷史敘述（`2026-08-05 起取代…`）、
`EDC 原始欄名` → `來源系統原始欄名`。私有 `CLAUDE.md` 不移植。

## 下一步

- [ ] **階段 5**：README（目前仍是 22 行「🚧 建置中」佔位）+ 架構圖 + CONTRIBUTING
- [ ] 階段 6：發佈設定（GitHub About / topics / 要不要 Pages）

## 跨 PC 續作

`cd factory-yield-analytics && git pull`，讀本檔 + 設計文件，從「進行中 / 待辦」第一個未打勾項繼續。
去識別化工具箱在私有 repo `node-fma-react/deident/`。
