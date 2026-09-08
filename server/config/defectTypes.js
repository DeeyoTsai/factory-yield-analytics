/**
 * 缺陷分類 — 全系統單一事實來源（12 類）。
 *
 * 前端有一份對應的 client/src/config/defectTypes.js，兩邊必須一致。
 * YOLO detector（ml/）回傳的 class 名也用這裡的 `yolo` 欄位。
 *
 * 想改成自己場域的缺陷分類：改這張表 + client 那份 + ml/classes.json，
 * 並重跑 `npm run seed`（fmatb 欄位由 code 產生）。
 */

const DEFECT_TYPES = [
  { code: "DF-01", key: "scratch", label: "刮傷", yolo: "scratch" },
  { code: "DF-02", key: "particle", label: "異物", yolo: "particle" },
  { code: "DF-03", key: "stain", label: "髒污", yolo: "stain" },
  { code: "DF-04", key: "broken", label: "破損", yolo: "broken" },
  { code: "DF-05", key: "bubble", label: "氣泡", yolo: "bubble" },
  { code: "DF-06", key: "residue", label: "殘膠", yolo: "residue" },
  { code: "DF-07", key: "filmthickness", label: "膜厚異常", yolo: "film_thickness" },
  { code: "DF-08", key: "developfail", label: "顯影不良", yolo: "develop_fail" },
  { code: "DF-09", key: "chip", label: "崩缺", yolo: "chip" },
  { code: "DF-10", key: "brightspot", label: "亮點", yolo: "bright_spot" },
  { code: "DF-11", key: "darkspot", label: "暗點", yolo: "dark_spot" },
  { code: "DF-12", key: "uneven", label: "色不均", yolo: "color_uneven" },
];

const DEFECT_KEYS = DEFECT_TYPES.map((d) => d.key);

// key -> label / code / yolo
const byKey = Object.fromEntries(DEFECT_TYPES.map((d) => [d.key, d]));
// yolo class -> key
const yoloToKey = Object.fromEntries(DEFECT_TYPES.map((d) => [d.yolo, d.key]));
// code -> key
const codeToKey = Object.fromEntries(DEFECT_TYPES.map((d) => [d.code, d.key]));

module.exports = { DEFECT_TYPES, DEFECT_KEYS, byKey, yoloToKey, codeToKey };
