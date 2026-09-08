/**
 * 產線與檢查站 —— 想接自己的產線配置就改這一檔（client 有一份對應的 copy）。
 *
 * LINES：製程產線（6 條）。
 * STATIONS：ADI／重工／第一檢出站的順序清單，前端表格與 domain 分析都依這個順序。
 */

const LINES = ["L1", "L2", "L3", "L4", "L5", "L6"];

const STATIONS = ["BM1", "BM2", "L1", "L2", "L3", "L4", "L5", "L6", "AOI"];

// AOI（自動缺陷檢查）機台
const AOI_MACHINES = ["AOI-01", "AOI-02", "AOI-03", "AOI-04", "AOI-05", "AOI-06"];

// 量測站（EDC 全距監控）站別 ↔ 機台，固定一對一
const EDC_STATION_MACHINE_PAIRS = [
  ["站別A", "機台M01"],
  ["站別B", "機台M02"],
  ["站別C", "機台M03"],
  ["站別D", "機台M04"],
  ["站別E", "機台M05"],
  ["站別F", "機台M06"],
];

module.exports = { LINES, STATIONS, AOI_MACHINES, EDC_STATION_MACHINE_PAIRS };
