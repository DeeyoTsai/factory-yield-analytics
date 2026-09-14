const path = require("path");
const dotenv = require("dotenv");
// ⚠️ 一定要指定 path：無參數的 dotenv.config() 相對 process.cwd() 找 .env，
// 從 repo 根目錄跑就讀不到，PORT/DB 帳密靜默退回預設，症狀很像 crash。
dotenv.config({ path: path.join(__dirname, ".env") });

// ⚠️ logger 必須在其他 require 之前載入並立刻掛崩潰攔截：require 階段本身就可能爆
// （model 定義錯、DB 設定壞），那時候還沒掛 handler 就會什麼都不留直接死掉。
const logger = require("./utils/logger");

// ── 崩潰攔截 ──────────────────────────────────────
// 攔得到：未捕捉例外、未處理 Promise rejection（Node ≥15 預設會直接終止行程）
// 攔不到：Node heap OOM、V8 fatal、被 OS kill —— 那幾種要靠行程管理器（pm2 等）接管道
process.on("uncaughtException", (err) => {
  logger.fatal("未捕捉的例外，行程即將結束", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  logger.fatal("未處理的 Promise rejection，行程即將結束", reason);
  process.exit(1);
});
// 記「正常關閉」，排查時才分得出人為停止 vs 真 crash
process.on("SIGINT", () => { logger.info("收到 SIGINT，正常關閉"); process.exit(0); });
process.on("SIGTERM", () => { logger.info("收到 SIGTERM，正常關閉"); process.exit(0); });

const express = require("express");
const cors = require("cors");
const passport = require("passport");

const app = express();
const PORT = process.env.PORT || 8080;
const requireJwt = passport.authenticate("jwt", { session: false });

require("./config/passport")(passport);

const routes = require("./routes");
const rgbTopFiveRoutes = require("./routes/rgbTopFiveRoutes");
const eqActionRoutes = require("./routes/eqActionRoutes");
const pdamtableRoutes = require("./routes/pdamtableRoutes");
const glassInfoRoutes = require("./routes/glassInfoRoutes");
const trendChartRoutes = require("./routes/trendChartRoutes");
const unfinishLotRoutes = require("./routes/unfinishLotRoutes");
const edcRoutes = require("./routes/edcRoutes");

const db = require("./models");
// ⚠️ sync() 一定要 .catch()：裸呼叫時 DB 連不上就是一個未處理 rejection，Node 20 直接殺行程。
db.sequelize.sync()
  .then(() => logger.info("資料庫 sync 完成"))
  .catch((err) => logger.error("資料庫 sync 失敗（server 仍會啟動，DB 相關 API 會失敗）", err));

// ── Middleware ───────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Request log：回答「crash 前最後一支 API 是誰」。只記 method/url/狀態/耗時/IP，
// 不記 body（可能含密碼）與 header（有 Authorization）。
const QUIET_PATHS = ["/api/edc/crawl/status"]; // 前端 4s 輪詢，正常時不記，異常/變慢照記
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    if (!req.originalUrl.startsWith("/api/")) return; // 靜態檔量大又無診斷價值
    const ms = Date.now() - startedAt;
    if (QUIET_PATHS.some((p) => req.originalUrl.startsWith(p)) && res.statusCode < 400 && ms < 1000) return;
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "-";
    const line = `${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms ${ip}`;
    if (res.statusCode >= 500) logger.error(`請求失敗 ${line}`);
    else logger.info(line);
  });
  next();
});

// ── Routes ───────────────────────────────────────
app.use("/api/user", routes.auth);
app.use("/api/fmatable", requireJwt, routes.fmatable);
app.use("/api/imgtable", routes.imgtable); // 影像表：demo 開放，接自己資料流時可加 requireJwt

app.use("/api", requireJwt, rgbTopFiveRoutes);
app.use("/api/eq-actions", requireJwt, eqActionRoutes);
app.use("/api/pdamtable", requireJwt, pdamtableRoutes);
app.use("/api/glass-info", requireJwt, glassInfoRoutes);
app.use("/api/trend-chart", requireJwt, trendChartRoutes);
app.use("/api/unfinish-lot", requireJwt, unfinishLotRoutes);
app.use("/api/edc", requireJwt, edcRoutes);

// ── 前端 build + 上傳/生成的影像 ────────────────────
// 影像放 client/media（CRA build 不掃描的目錄；ingestion adapter / YOLO 服務往這裡寫）。
app.use(express.static(path.join(__dirname, "../client/media"), { index: false }));
app.use(express.static(path.join(__dirname, "../client/build")));
// SPA fallback：非 /api 的路徑都回 index.html
app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build", "index.html"), (err) => {
    if (err) res.status(404).send("前端尚未 build：先在 client/ 執行 npm run build");
  });
});

// ── Express 錯誤處理（必須 4 個參數，位置在所有路由之後）────────────────
app.use((err, req, res, next) => {
  logger.error(`未處理的請求錯誤 ${req.method} ${req.originalUrl}`, err);
  if (res.headersSent) return next(err);
  res.status(500).json({ success: false, msg: "伺服器內部錯誤" });
});

logger.cleanupOldLogs();

app.listen(PORT, () => {
  logger.info(
    `後端伺服器運行中... PORT=${PORT} PID=${process.pid} Node=${process.version} log=${logger.LOG_DIR}`
  );
});
