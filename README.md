# FMA 良率平台（開源版）

**Factory Yield Analytics & Defect Recognition Platform — open-source edition**

一套我獨力開發的工廠良率系統的**去識別化、可運作**開源版本：整合人工缺陷登錄（FMA）、
良率／缺陷資料倉的三層鑽取分析、EDC 全距 SPC 監控、排程與機況甘特圖，以及
YOLO 電腦視覺自動判缺陷並預填 FMA 表格。

A de-identified, **runnable** open-source edition of a factory yield-analytics system I
built solo: manual defect logging (FMA), drill-down yield/defect analytics, EDC range
SPC monitoring, schedule/machine-status Gantt charts, and a YOLO vision pipeline that
classifies defect photos and pre-fills the FMA table.

技術棧 / Stack：React · Node.js/Express · Sequelize/MySQL · ECharts · MUI · Python (optional)

## 狀態 / Status

🚧 建置中。設計文件見 [`docs/dev/2026-09-08-open-source-edition-design.md`](docs/dev/2026-09-08-open-source-edition-design.md)。

- **所有資料、代碼、產線與型號皆為假資料**，不含任何真實生產資訊。
  All data, codes, production lines and model names are fabricated.
- 對外資料交換（FTP／爬蟲）不隨附實作，改由可插拔的 ingestion adapter 串接。
