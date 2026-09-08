/**
 * 部門對照 + 由工號推導部門 —— 想接自己的工號規則就改這一檔。
 *
 * 原系統用「工號數字區段 / 首字」對應部門，這裡保留同一套機制，
 * 部門代碼用泛用的品保／製造縮寫。
 */

// 代碼 -> 全名
const DEPARTMENTS = {
  FQA: "Final Quality Assurance",
  IQC: "Incoming Quality Control",
  PQC: "Process Quality Control",
  MFG: "Manufacturing",
  ENG: "Engineering",
  MGT: "Management",
};

const DEFAULT_DEPARTMENT = "MFG";

// 工號首字 -> 部門
const FIRST_CHAR_RULES = {
  F: "FQA",
  I: "IQC",
  P: "PQC",
  M: "MFG",
  E: "ENG",
  A: "MGT",
  G: "MGT",
};

// 純數字工號：前兩碼落在哪個區間 -> 部門
const NUMERIC_RANGE_RULES = [
  { min: 10, max: 19, dept: "FQA" },
  { min: 20, max: 29, dept: "IQC" },
  { min: 30, max: 39, dept: "PQC" },
  { min: 40, max: 69, dept: "MFG" },
  { min: 70, max: 89, dept: "ENG" },
  { min: 90, max: 99, dept: "MGT" },
];

/**
 * 由工號推導部門代碼。
 * @param {string} employeeId 工號（例 E-1042 / 1042 / A123456）
 * @returns {string} 部門代碼
 */
function inferDepartment(employeeId) {
  if (!employeeId) return DEFAULT_DEPARTMENT;
  const id = String(employeeId).toUpperCase();

  const alpha = id.replace(/[^A-Z]/g, "")[0];
  if (alpha && FIRST_CHAR_RULES[alpha]) return FIRST_CHAR_RULES[alpha];

  const digits = id.replace(/\D/g, "");
  if (digits.length >= 2) {
    const head = parseInt(digits.slice(0, 2), 10);
    const hit = NUMERIC_RANGE_RULES.find((r) => head >= r.min && head <= r.max);
    if (hit) return hit.dept;
  }

  return DEFAULT_DEPARTMENT;
}

module.exports = { DEPARTMENTS, DEFAULT_DEPARTMENT, inferDepartment };
