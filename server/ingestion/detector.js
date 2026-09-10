/**
 * YOLO 推論的 server 端薄封裝
 * ===========================
 *
 * ingestion adapter 拿到一張瑕疵影像後，呼叫這裡取得偵測結果，
 * 再把結果以 `pred_result` 契約寫進 `imagetb`：
 *
 *     { "detections": [ { "class": "<yolo class>", "confidence": <0..1>, "bbox": [x,y,w,h] } ] }
 *
 * 前端 (`DefectTableElement` / `fma-table-element`) 會用 `config/defectTypes.js`
 * 的 `yolo -> key` 對照，把每張影像的第一個 detection 統計進 FMA 表格對應欄位。
 *
 * 兩種模式：
 *  1. 設了環境變數 `DETECTOR_URL`（例如 http://localhost:8000/detect，見 ml/app.py）
 *     → POST multipart 影像過去，回應直接當成 detections。
 *  2. 沒設 → 用內建 mock：依影像位元組的雜湊產生「穩定」的假 detection
 *     （同一張圖每次結果一樣），讓整條 YOLO → FMA 預填流程不裝 Python 也能 demo。
 *
 * 影像來源支援：本機路徑字串、Buffer、或 http(s) URL。
 */

const fs = require("fs");
const { DEFECT_TYPES } = require("../config/defectTypes");

const YOLO_CLASSES = DEFECT_TYPES.map((d) => d.yolo);

/** 讀進 Buffer：Buffer 原樣回傳、http(s) 用 fetch 抓、其餘當本機路徑。 */
async function toBuffer(image) {
  if (Buffer.isBuffer(image)) return image;
  if (typeof image !== "string") {
    throw new TypeError("detector: image 需為 Buffer / 路徑字串 / URL");
  }
  if (/^https?:\/\//i.test(image)) {
    const resp = await fetch(image);
    if (!resp.ok) throw new Error(`detector: 影像下載失敗 ${resp.status} ${image}`);
    return Buffer.from(await resp.arrayBuffer());
  }
  return fs.promises.readFile(image);
}

/** FNV-1a 32-bit —— 給 mock 一個穩定的種子。 */
function hashBytes(buf) {
  let h = 0x811c9dc5;
  for (let i = 0; i < buf.length; i += 1) {
    h ^= buf[i];
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 內建 mock：依影像雜湊決定 1~3 個 detection，結果對同一張圖穩定。 */
function mockDetect(buf) {
  let seed = hashBytes(buf) || 1;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };
  const n = 1 + Math.floor(rand() * 3);
  const detections = [];
  for (let i = 0; i < n; i += 1) {
    const cls = YOLO_CLASSES[Math.floor(rand() * YOLO_CLASSES.length)];
    detections.push({
      class: cls,
      confidence: Math.round((0.55 + rand() * 0.43) * 100) / 100,
      bbox: [
        Math.floor(rand() * 200),
        Math.floor(rand() * 200),
        20 + Math.floor(rand() * 80),
        20 + Math.floor(rand() * 80),
      ],
    });
  }
  return detections;
}

/** 呼叫遠端 DETECTOR_URL。回應需含 `detections` 陣列。 */
async function remoteDetect(buf, url, filename) {
  const form = new FormData();
  form.append("file", new Blob([buf]), filename || "image.jpg");
  const resp = await fetch(url, { method: "POST", body: form });
  if (!resp.ok) throw new Error(`detector: 推論服務回應 ${resp.status}`);
  const body = await resp.json();
  if (!Array.isArray(body.detections)) {
    throw new Error("detector: 推論服務回應缺少 detections 陣列");
  }
  return body.detections;
}

/**
 * 偵測單張影像。
 * @param {Buffer|string} image  Buffer / 本機路徑 / http(s) URL
 * @param {{ detectorUrl?: string, filename?: string }} [opts]
 * @returns {Promise<{ detector: string, detections: Array<{class:string,confidence:number,bbox:number[]}> , pred_result: string }>}
 */
async function detect(image, opts = {}) {
  const url = opts.detectorUrl ?? process.env.DETECTOR_URL ?? "";
  const buf = await toBuffer(image);

  let detector = "mock";
  let detections;
  if (url) {
    try {
      detections = await remoteDetect(buf, url, opts.filename);
      detector = url;
    } catch (err) {
      console.warn(`[detector] 遠端推論失敗，改用 mock：${err.message}`);
      detections = mockDetect(buf);
    }
  } else {
    detections = mockDetect(buf);
  }

  return { detector, detections, pred_result: JSON.stringify({ detections }) };
}

module.exports = { detect, mockDetect, YOLO_CLASSES };
