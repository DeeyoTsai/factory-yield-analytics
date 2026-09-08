/**
 * 產線與檢查站 —— 前端這份必須與 server/config/stations.js 一致。
 */

export const LINES = ["L1", "L2", "L3", "L4", "L5", "L6"];

export const STATIONS = ["BM1", "BM2", "L1", "L2", "L3", "L4", "L5", "L6", "AOI"];

export const AOI_MACHINES = [
  "AOI-01", "AOI-02", "AOI-03", "AOI-04", "AOI-05", "AOI-06",
];

export const EDC_STATION_MACHINE_PAIRS = [
  ["站別 A", "機台 M01"],
  ["站別 B", "機台 M02"],
  ["站別 C", "機台 M03"],
  ["站別 D", "機台 M04"],
  ["站別 E", "機台 M05"],
  ["站別 F", "機台 M06"],
];
