/**
 * 產線與檢查站 —— 前端這份必須與 server/config/stations.js 一致。
 */

export const LINES = ["L1", "L2", "L3", "L4", "L5", "L6"];

export const STATIONS = ["BM1", "BM2", "L1", "L2", "L3", "L4", "L5", "L6", "AOI"];

export const AOI_MACHINES = [
  "AOI-01", "AOI-02", "AOI-03", "AOI-04", "AOI-05", "AOI-06",
];

export const EDC_STATION_MACHINE_PAIRS = [
  ["站別A", "機台M01"],
  ["站別B", "機台M02"],
  ["站別C", "機台M03"],
  ["站別D", "機台M04"],
  ["站別E", "機台M05"],
  ["站別F", "機台M06"],
];
