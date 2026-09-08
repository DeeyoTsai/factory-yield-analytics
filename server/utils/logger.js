'use strict';

// Web server 的檔案 log：dayjs 時間戳 + fs.appendFileSync，按日分檔。
// 不引入 winston/pino——低流量內部工具、dayjs 已是依賴，沒必要。
//
// ⚠️ 為什麼「同時」寫檔案又 console：
//   - 檔案（server/logs/server-YYYY-MM-DD.log）：程式內攔得到的錯誤，含完整 stack
//   - console：交給行程管理器（pm2 等）寫 stdout/stderr。Node heap OOM、V8 fatal
//     這類死法 JS 完全沒有機會執行，自寫的寫檔一個字都出不去，只有那份留得下來
//   兩份都要，是刻意的冗餘。
//
// ⚠️ 為什麼全部用同步 appendFileSync，而不是 createWriteStream：
//   createWriteStream + process.exit() 實測會掉行——process.exit() 不等 stream flush，
//   緩衝區連同行程一起消失。這支 logger 的用途就是查 crash，崩潰前最後幾筆 request
//   log 正是關鍵證據，不能「有機會遺失」。低流量下單次 appendFileSync 約 0.1ms，可忽略。
//
// ⚠️ 絕對不要把 token、密碼、process.env.PASSPORT_SECRET 丟進 logger——
//   有了這支 logger，console 輸出就等於落檔。

const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');

const LOG_DIR = path.join(__dirname, '..', 'logs');
// 保留天數。log 是純文字、量不大，30 天足夠回溯「上次 crash 是什麼時候開始的」
const RETENTION_DAYS = Number(process.env.LOG_RETENTION_DAYS || 30);

// 寫檔連續失敗（磁碟滿、權限不足）就停用檔案輸出，只留 console。
// log 寫不出去絕對不能比原本的問題更嚴重——不能因此把 server 弄掛。
let fileDisabled = false;

function write(level, msg) {
  const line = `[${dayjs().format('YYYY/MM/DD HH:mm:ss')}] [${level}] ${msg}\n`;
  if (!fileDisabled) {
    try {
      fs.mkdirSync(LOG_DIR, { recursive: true });
      // 按日分檔：檔名每天換，服務連續跑好幾天也不會累積成單一巨檔
      fs.appendFileSync(path.join(LOG_DIR, `server-${dayjs().format('YYYY-MM-DD')}.log`), line);
    } catch (e) {
      fileDisabled = true;
      console.error(`[logger] 寫入 log 失敗，後續只輸出 console：${e.message}`);
    }
  }
  return line.trim();
}

/** 把 Error 攤成可讀字串。沒有 stack 的（例如 reject 一個字串）也要能記下來 */
function describeError(err) {
  if (!err) return '(無錯誤物件)';
  if (err instanceof Error) return err.stack || `${err.name}: ${err.message}`;
  if (typeof err === 'object') {
    try { return JSON.stringify(err); } catch (_) { return String(err); }
  }
  return String(err);
}

const info = (msg) => { console.log(write('INFO', msg)); };
const warn = (msg) => { console.warn(write('WARN', msg)); };

const error = (msg, err) => {
  console.error(write('ERROR', err === undefined ? msg : `${msg}\n${describeError(err)}`));
};

/** 崩潰專用。層級名稱不同（FATAL）方便 grep 出「行程死掉」的時間點 */
const fatal = (msg, err) => {
  console.error(write('FATAL', err === undefined ? msg : `${msg}\n${describeError(err)}`));
};

/** 刪除超過保留天數的 log。啟動時呼叫一次即可，量小、不需要排程 */
function cleanupOldLogs() {
  try {
    if (!fs.existsSync(LOG_DIR)) return;
    const cutoff = dayjs().subtract(RETENTION_DAYS, 'day');
    for (const name of fs.readdirSync(LOG_DIR)) {
      const m = name.match(/^server-(\d{4}-\d{2}-\d{2})\.log$/);
      if (!m) continue;                      // pm2 自己的 log 檔不要動
      if (dayjs(m[1]).isBefore(cutoff, 'day')) {
        fs.unlinkSync(path.join(LOG_DIR, name));
      }
    }
  } catch (e) {
    console.error(`[logger] 清理舊 log 失敗：${e.message}`);
  }
}

module.exports = { info, warn, error, fatal, cleanupOldLogs, LOG_DIR };
