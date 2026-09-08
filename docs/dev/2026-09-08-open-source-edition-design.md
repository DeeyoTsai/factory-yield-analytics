# 設計文件：去識別化開源版 FMA 良率平台

- 日期：2026-09-08
- 狀態：**待 Dave 審閱**（審過才進實作）
- 前身：`SHOWCASE_LANDING_PAGE.md`（私有 repo）記載的「像素級 clone 展示頁」方向已作廢

---

## 1. 目標

把我獨力開發的工廠內部良率系統，做成一個**可運作、去識別化的開源版本**：

- 前後端都是**真的會跑**的程式（不是靜態仿製頁）。
- 別人 `git clone` 後，填好 DB 連線、跑 seed、啟動，即可看到完整系統。
- 想接自己的生產資料，只要實作一個 ingestion adapter，不需要改動核心。
- FTP 資料交換、對外爬蟲**不實作**，只在文件描述串接概念（不同場域作法本就不同；能直連 DB 的場域甚至不需要爬蟲）。
- **YOLO × Defect FMA 整合**要能實際展示：AI 預測結果自動預填 FMA 表格這條路徑在 demo 端跑得通。
- 良率／機況資料用 seed 假資料讓畫面有東西可看。

repo：沿用現有 public repo `factory-yield-analytics`，**不帶任何私有 repo 的 git history**，全新 README / CLAUDE.md。

---

## 2. 階段 0 — 鎖定的決策

| 項目 | 決策 |
|---|---|
| 授權 | MIT |
| 語言 | 文件與 README 繁中為主；專有詞／不確定的術語保留英文，不硬翻；程式碼註解維持繁中，就地清理原公司／廠區相關內容 |
| 啟動方式 | npm scripts + 手動裝 MySQL/MariaDB（暫不做 docker-compose） |
| 權限系統 | 保留「工號數字 → 部門 → 權限層級」機制；部門對照抽成 `server/config/departments.js`，部門名泛用（`QA / IQC / PROD / ENG / MGMT`） |
| YOLO | 附整合程式碼 + 可插拔 detector 介面 + mock detector（回固定 detection）+ Python 推論骨架（FastAPI，`ml/`，標 optional）；**不附**權重、**不附** FTP daemon |
| 畫面範圍 | 先做核心子集（見 §4.3，10 個畫面）；ADI Analysis、個人頁、OverShoot 延後；external-links 保留但內容改成範例連結 |
| 登入體驗 | demo 帳號密碼 `demo1234`，登入頁加「以 Demo 帳號登入」按鈕（operator 層級），瀏覽者一鍵進站 |
| seed | 程式化 `server/seed/seed.js` + `npm run seed`，truncate 後重插；資料跨約 3 週，畫面非空、三層鑽取可用 |
| CI | GitHub Actions 跑去識別化 grep gate，命中禁區關鍵字即 fail |
| 舊檔 | 刪掉 `factory-yield-analytics/` 現有的靜態仿製首頁（`index.html` / `styles.css` / `app.js`） |
| FTP | 只在 `docs/` 寫概念 + 留 adapter 接點，不寫任何 FTP client 程式碼 |
| 資料匯入 | ingestion adapter 介面 + `seedAdapter`（可運作）；原系統爬蟲零程式碼進 repo |
| DB schema | 靠 `sequelize.sync()` 建表，不引入 migration 框架 |
| 分支 | 新 repo 只用 `main` |
| 規劃文件 | 放 `factory-yield-analytics/docs/dev/`；私有 repo 的 `SHOWCASE_LANDING_PAGE.md` 改成一行指標 |

---

## 3. 階段藍圖

| 階段 | 內容 | 產出型態 |
|---|---|---|
| **0** | 決策與邊界 | 本文件 §2 |
| **1** | 新 repo 骨架：選檔搬移 + 去識別化 + 最小可運作前後端 + seed + 啟動 | 本文件 §4（已 grill） |
| 2 | YOLO × Defect FMA 整合：detector 介面 + mock + Python 骨架 | 另開 grill → spec |
| 3 | 良率／機況畫面：seed 假資料補齊 | 另開 grill → spec |
| 4 | ingestion adapter 契約 + `docs/ingestion.md`（FTP／爬蟲／直連三 pattern） | 另開 grill → spec |
| 5 | README + `docs/` + 架構圖 + 授權 + CI gate | 另開 grill → spec |
| 6 | 發佈：GitHub Pages 文件站（如要）、topics、About | 另開 grill → spec |

phase 2–6 之後逐塊 grill；本文件先把 phase 1 定死。

---

## 4. 階段 1 詳細規格

### 4.1 目錄結構（新 repo）

```
factory-yield-analytics/
├── client/                 # React 前端（選擇性搬移，見 §4.3）
├── server/
│   ├── config/
│   │   ├── database.js
│   │   ├── passport.js
│   │   └── departments.js  # 新增：工號→部門對照（可自訂）
│   ├── controllers/
│   ├── domain/             # 新增：由 crawler/ 抽出的純演算法 + 寫入層
│   │   ├── edcAnalysis.js  (+ .test.js)
│   │   ├── edcShift.js     (+ .test.js)
│   │   ├── phaseProcess.js (+ .test.js)
│   │   ├── unfinishParsers.js
│   │   ├── edcStore.js
│   │   └── unfinishStore.js
│   ├── ingestion/          # 新增
│   │   ├── adapter.js      # adapter 介面定義（JSDoc 契約）
│   │   └── seedAdapter.js  # 讀 fixtures/*.json 寫入良率表
│   ├── middleware/
│   ├── models/             # 25 個 model 全搬
│   ├── routes/
│   ├── seed/
│   │   ├── seed.js         # npm run seed 進入點
│   │   └── fixtures/*.json # 合成資料
│   ├── utils/
│   ├── .env.example        # 單一份
│   └── index.js
├── ml/                     # optional Python 推論骨架
│   ├── app.py              # FastAPI：POST 圖片 → detections JSON
│   ├── mock_detector.py
│   ├── requirements.txt
│   └── README.md
├── docs/
│   └── dev/                # 本設計文件所在
├── .github/workflows/deidentify-gate.yml
├── CLAUDE.md               # 全新
├── README.md               # 全新
└── LICENSE                 # MIT
```

### 4.2 檔案搬移清單

**server —— 搬（去識別化後）**
- `models/*`（25 個）、`controllers/*`、`routes/*`、`middleware/*`、`utils/*`、`config/database.js`、`config/passport.js`、`index.js`、`package.json`（清依賴）

**server —— 移到 `server/domain/`**
- `crawler/edcAnalysis.js` `edcShift.js` `phaseProcess.js` `unfinishParsers.js` + 對應 `.test.js`
- `crawler/edcStore.js` `crawler/unfinishStore.js`

**server —— 刪除（不進 repo）**
- `crawler/yieldCrawl-claude.js` `edcCrawl.js` `edcCrawlRunner.js` `rgbYieldCrawler.js` `hourlyDefectCrawler.js` `testPuppeteer.js`
- `crawler/edcTuning.js` + 其輸出 HTML、EDC 表單 debug HTML、`edc.status.json`、`CHANGELOG.md`
- `crawler/__fixtures__/` 內的 EDC 真實樣本 JSON（真實量產資料）
- `crawler/logs/` `logs/` `tests/`（stub）

**server —— 依賴移除**：`puppeteer` `playwright` `cheerio` `xlsx`（皆爬蟲／匯出專用，資料源改走 adapter，全部移除）。

**client —— 搬（去識別化後，見 §4.3 篩選）**
- `src/components/`（篩選）、`src/contexts/*`、`src/services/*`、`src/config/*`、`public/`（清真實圖檔）、`package.json`

**完全不搬**
- `ftp_exchange_data/`（整個目錄）、`runs/`、`2026-07-08_EDC_DATA_07-21.xlsm`、`*.log`、`httpie指令.txt`、`GEMINI.MD`
- `PM2_DEPLOYMENT.md` `EDC_DEPLOYMENT.md` `PRODUCTION_BUILD.md` `SHOWCASE_LANDING_PAGE.md`
- `.claude/`、`docs/superpowers/`、私有 `CLAUDE.md`

### 4.3 核心子集畫面

| 路由 | 元件 | 狀態 |
|---|---|---|
| `/` | `home-component` | 搬 |
| `/register` `/login` | `register-component` `login-component` | 搬 |
| `/fmaquery` `/queryResult` | `fma-query-component` `query-result-component` | 搬（FMA 記錄查詢） |
| `/fmatable` | `fma-table-component` + `elements/*` | 搬（**YOLO×FMA 整合所在**，必留） |
| `/users` | `user-management-component` | 搬 |
| `/yield-dashboard` | `yield-system/views/Dashboard` | 搬（三層鑽取） |
| `/yield-unfinish-lot` | `yield-system/views/UnfinishLotView` | 搬（三層鑽取） |
| `/yield-edc-range` | `yield-system/views/EdcRangeView` | 搬（二層鑽取） |
| `/yield-eq-actions` | `yield-system/views/MachineStatusView` | 搬（Gantt） |
| `/external-links` | `ExternalLinksView` | 搬（內容改成 3–4 個範例連結指向 `#`：生產系統／品質系統／設備管理／知識庫） |
| `/profile` | `profile-component` | **延後**（很小，日後可快速補回） |
| `/yield-ginfo` | `AdiAnalysisView` | **延後** |
| `/yield-over-shoot-detail/...` | `OverShootDetailView` | **延後** |

核心子集共 **10 個畫面**（含登入／註冊）。

連帶剔除的孤兒元件：`postCourse-component.js`、`enroll-component.js`、`elements/fetchTestData.jsx`、`elements/dashboard-gauge-chart.js`（首頁已註解不用）。

nav（`nav-component.js`）：移除延後項的連結；登入頁加「以 Demo 帳號登入」按鈕。

### 4.4 去識別化執行流程

去識別化的**完整字面對照清單 + sed 替換腳本**是維護者的私有工具，**不隨附本 repo**
（清單本身含真實 email／分機／密碼／型號，公開等於洩漏）。放在維護者私有環境
`deident/`（見附錄 A 說明）。

1. 依私有 `deident/scrub.sed` 對搬過來的檔案跑自動替換。
2. 一次搬一個子系統 → 跑 sed → **逐檔完整人工複審** → 該檔 commit。
3. `scripts/deidentify-gate.sh`（+ `.github/workflows/deidentify-gate.yml`）：**結構型** gate，
   只檢查格式（內網 IP、`.aspx`、UNC 路徑、硬編密碼、非公開 email），不含任何真實字串，
   適合放公開 repo。作為回歸防線，不取代人工複審。
4. push 到公開 repo 前，維護者在私有端對整個工作樹跑一次**完整字面清單**比對。
5. 每個進 repo 的檔案 commit 前都由我完整讀過一次。

**已知去識別化熱點**（搬到時逐一處理）：
- `routes/img-table-route.js`：line→機台代碼硬編對照、`.env` 路徑（改讀 `server/.env`）、模型權重路徑 env
- `contexts/DashboardContext.js`：兩張真實 defect 類名對照表（連同 YOLO class 名一起泛化為 12 類）
- `utils/employeeValidation.js`：部門代碼
- `models/*`：註解內的內部系統／廠區用語、欄位推導說明
- `domain/edc*`：站別↔機台配對常數、line 對應函式、shot 欄位（四角點欄名屬通用對位量測術語可留，值要假）
- 前端各 view：卡片標題含廠區碼、內部系統名

### 4.5 ingestion adapter（階段 1 只立骨架，契約細節留階段 4）

```js
// server/ingestion/adapter.js
/**
 * @typedef {Object} IngestionAdapter
 * @property {() => Promise<void>} run  拉外部資料 → 正規化 → 呼叫 domain/*Store 寫入
 */
```

- `seedAdapter.js`：`run()` 讀 `server/seed/fixtures/*.json`，經 `edcStore` / `unfinishStore` / 直接 model 寫入。
- `npm run seed` 實際上就是跑 `seedAdapter.run()` + 建 demo 使用者 + FMA 假資料。

### 4.6 seed 內容

| 資料 | 量 | 用途 |
|---|---|---|
| demo 使用者 | 3（operator `E-1001` / manager `E-1040` / admin `E-1090MGR`），密碼一律 `demo1234`，明寫在 README + 登入頁「以 Demo 帳號登入」按鈕 | 登入 + 權限層級展示 |
| FMA outline + glass + fmatb | ~15 outline，每筆數片 glass | 首頁 KPI／outline 表／FMA 查詢 |
| `imagetb` | ~20 列，帶 mock `pred_result` JSON | YOLO 預填 demo（階段 2 深化） |
| Daily Yield（RgbTopFive / AllTopFive / GlassInfo / AdiRecord / ReworkHis / TrendChart / OvenSlot …） | 跨 ~3 週 | `/yield-dashboard` 三層鑽取 |
| 未結批（UnfinishLot / UnfinishDefect / UnfinishDefectDetail） | 數個 lot | `/yield-unfinish-lot` |
| EDC（EdcRecord / EdcSegment / EdcGlassRecord / EdcFlaggedGlass） | 數站 × 數班 | `/yield-edc-range` |
| EqAction | 跨 ~3 週、6 條線 | `/yield-eq-actions` Gantt |

冪等：`seed.js` 開頭 truncate 上述表（demo 資料表），再重插。

### 4.7 啟動流程（進 README）

```bash
git clone https://github.com/DeeyoTsai/factory-yield-analytics.git
cd factory-yield-analytics

# 1. 建空資料庫
mysql -u root -p -e "CREATE DATABASE fma_yield CHARACTER SET utf8mb4;"

# 2. 後端設定
cd server
cp .env.example .env         # 填 DB_*, JWT_SECRET(>=32), PASSPORT_SECRET, PORT
npm install
npm run seed                 # 建表(sync) + 灌 demo 資料
npm run dev                  # http://localhost:8080

# 3. 前端
cd ../client
npm install
npm start                    # http://localhost:3000
```

### 4.8 階段 1 完成準則

- [ ] `npm run seed && npm run dev` + `npm start` 後，核心子集 10 個畫面都能開、有資料
- [ ] 登入頁「以 Demo 帳號登入」按鈕一鍵進站
- [ ] Daily Yield / 未結批 / EDC 三層／二層鑽取點得下去（假資料）
- [ ] `domain/*.test.js`（edcAnalysis / edcShift / phaseProcess / edcOutlier）全綠
- [ ] 去識別化 grep gate 綠（本機 + CI）
- [ ] 全 repo 無 `ftp_exchange_data` 參照、無 puppeteer/playwright/cheerio 依賴
- [ ] YOLO 預填：FMA 填表頁按 Refresh 能把 mock `pred_result` 填進表格（完整深化留階段 2）

---

## 5. 風險 / 待確認

- **YOLO 預填端到端**：`imagetb.pred_result` 的實際 JSON 結構要從 `fma-table-element.js:470-486` 與一份真實樣本反推，寫進 mock。階段 2 處理，階段 1 先給「能填進去就好」的最小 mock。
- **前端隱藏的內部字串**：view 元件多、字串散，靠人工複審 + 私有端完整清單比對 + 結構型 gate 三層防護，仍可能漏。
- **seed 資料量 vs Pi 效能**：EDC glass record 可能上千列，seed 時間要留意（私有版實測 771 片寫入 ~5s）。
- **`react-calendar` / `@wojtekmaj/react-daterange-picker`**：首頁日期選擇器用，保留。

---

## 附錄 A：去識別化 — 目標詞彙表

> 版型／class／ECharts 用法一律不動，只換字串與識別性數值。
>
> **來源字串對照（左欄）不列在本 repo。** 完整的「原字串 → 目標字串」對照清單、
> `deident/scrub.sed` 自動替換腳本、以及維護者 push 前跑的完整字面比對 `deident/check.sh`，
> 都放在維護者私有環境，理由：對照清單左欄本身就是真實 email／分機／密碼／型號／
> 內部代號的集合，放進公開 repo 等於把它們公開。

本 repo 只記錄**去識別化後應長什麼樣**（目標詞彙），供實作與複審對齊：

| 類別 | 目標值 |
|---|---|
| 產線 | `L1 L2 L3 L4 L5 L6`（6 條） |
| ADI／AOI 檢查機 | `AOI-01`–`AOI-06` |
| 量測站別（EDC） | `站別 A`–`站別 F` |
| 量測機台（EDC） | `機台 M01`–`機台 M06` |
| 站別順序清單 | `BM1, BM2, L1, L2, L3, L4, L5, L6, AOI` |
| recipe 欄位 | `recipe_id` |
| 缺陷類別 | 固定 **12 類**：`刮傷 異物 髒污 破損 氣泡 殘膠 膜厚異常 顯影不良 崩缺 亮點 暗點 色不均`；對照鍵 `DF-01`…`DF-12`（對外稱「支援 12 類缺陷」） |
| YOLO class | 對映到上述 12 類（`ml/classes.json`） |
| 產品型號 | `PNL-A140 / PNL-B156 / PNL-C238` |
| LOT 號 | `LOT-YYMMDDNN`（例 `LOT-24081201`） |
| Glass ID | `GL-YYMMDDNN-XX`（例 `GL-24081201-05`） |
| 工號 | `E-XXXX`（例 `E-1042`） |
| 部門 | `QA / IQC / PROD / ENG / MGMT`（`server/config/departments.js` 可自訂） |
| Daily Yield 頁標題 | `工廠 Daily Yield` |
| 未結批頁標題 | `未結批良率` |
| 對外系統連結 | `#` / `javascript:void(0)` |
| footer | `© 2026 · FMA 良率平台 · 開源版` |
| 對位量測四角點欄名（`FRX/FRY/FLX/FLY/RLX/RLY/RRX/RRY`） | **保留**（通用術語），但欄位值要假 |

**結構型 gate**（`scripts/deidentify-gate.sh`，公開）擋的是格式：RFC1918 內網 IP、
`.aspx` 內部頁、Windows UNC 路徑、疑似硬編密碼、非公開網域 email。它不含任何真實字串。

---

## 附錄 B：`imagetb.pred_result` 契約（暫定，階段 2 定死）

`ml/app.py` 的 detector 回傳、seed 寫入 `imagetb.pred_result` 的 JSON：

```json
{
  "detections": [
    { "class": "刮傷", "confidence": 0.92, "bbox": [x, y, w, h] }
  ]
}
```

前端 `fma-table-element` 目前取「第一筆 detection」對照 `labeledDefect` 統計進表格。階段 2 會依實際程式碼把此契約定死。
