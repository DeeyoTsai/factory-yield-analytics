/**
 * 缺陷分類 — 前端這份必須與 server/config/defectTypes.js 一致。
 * 想改缺陷分類：兩份 + ml/classes.json 一起改，再重跑 npm run seed。
 */

export const DEFECT_TYPES = [
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

export const DEFECT_KEYS = DEFECT_TYPES.map((d) => d.key);

export const byKey = Object.fromEntries(DEFECT_TYPES.map((d) => [d.key, d]));
export const byLabel = Object.fromEntries(DEFECT_TYPES.map((d) => [d.label, d]));
export const yoloToKey = Object.fromEntries(DEFECT_TYPES.map((d) => [d.yolo, d.key]));
export const codeToKey = Object.fromEntries(DEFECT_TYPES.map((d) => [d.code, d.key]));
