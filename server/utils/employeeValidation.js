/**
 * 工號驗證 + 由工號決定部門與權限。
 *
 * 部門推導規則在 config/departments.js（想接自己的工號規則改那裡）。
 * 權限層級目前只有 normal / admin 兩級，並相容舊字串（operator/supervisor/manager/super）。
 */

const { DEPARTMENTS, inferDepartment } = require("../config/departments");

const EMPLOYEE_RULES = {
  MIN_LENGTH: 6,
  MAX_LENGTH: 10,
  PATTERNS: [
    /^\d{6,8}$/, // 純數字 6-8 位
    /^[A-Z]\d{6,7}$/, // 字母 + 數字，如 A123456
    /^\d{4}[A-Z]\d{2,3}$/, // 數字 + 字母 + 數字
    /^[A-Z]-\d{3,6}([A-Z]{2,4})?$/, // 連字號式，如 E-1042 / E-1090MGR
  ],
};

const PERMISSION_LEVELS = {
  NORMAL: "normal",
  ADMIN: "admin",
};

// 部門 -> 可具備的權限層級
const DEPARTMENT_PERMISSIONS = Object.fromEntries(
  Object.keys(DEPARTMENTS).map((code) => [
    code,
    code === "MGT"
      ? [PERMISSION_LEVELS.NORMAL, PERMISSION_LEVELS.ADMIN]
      : [PERMISSION_LEVELS.NORMAL],
  ])
);

function validateEmployeeFormat(employeeId) {
  if (!employeeId) return { valid: false, error: "工號不能為空" };

  if (
    employeeId.length < EMPLOYEE_RULES.MIN_LENGTH ||
    employeeId.length > EMPLOYEE_RULES.MAX_LENGTH
  ) {
    return {
      valid: false,
      error: `工號長度必須在 ${EMPLOYEE_RULES.MIN_LENGTH}-${EMPLOYEE_RULES.MAX_LENGTH} 位之間`,
    };
  }

  const ok = EMPLOYEE_RULES.PATTERNS.some((p) => p.test(employeeId));
  if (!ok) {
    return {
      valid: false,
      error: "工號格式不正確（支援：純數字、字母+數字、E-1042 這類連字號式）",
    };
  }
  return { valid: true, message: "工號格式驗證通過" };
}

// 對外沿用舊名，實作委派給 config/departments.js
function inferDepartmentFromEmployee(employeeId) {
  return inferDepartment(employeeId);
}

function determinePermissionLevel(department, employeeId) {
  if (/MGR|ADM/i.test(String(employeeId))) return PERMISSION_LEVELS.ADMIN;
  return PERMISSION_LEVELS.NORMAL;
}

const LEVEL_HIERARCHY = {
  [PERMISSION_LEVELS.NORMAL]: 1,
  [PERMISSION_LEVELS.ADMIN]: 2,
  // 相容舊字串
  operator: 1,
  supervisor: 1,
  manager: 1,
  normal: 1,
  super: 2,
  admin: 2,
};

function normalizeLevel(level) {
  return LEVEL_HIERARCHY[level] >= 2
    ? PERMISSION_LEVELS.ADMIN
    : PERMISSION_LEVELS.NORMAL;
}

function hasPermission(userLevel, requiredLevel) {
  return (LEVEL_HIERARCHY[userLevel] || 0) >= (LEVEL_HIERARCHY[requiredLevel] || 0);
}

// resource -> action -> 允許的層級
const RESOURCE_PERMISSIONS = {
  dashboard: { read: ["normal"], write: ["normal"] },
  "fma-table": { read: ["normal"], write: ["normal"], delete: ["normal"] },
  reports: { read: ["normal"], export: ["normal"] },
  "user-management": {
    read: ["normal", "admin"],
    write: ["admin"],
    delete: ["admin"],
  },
};

function canAccessResource(user, resource, action = "read") {
  if (!user || !user.level) return false;
  if (normalizeLevel(user.level) === PERMISSION_LEVELS.ADMIN) return true;

  const rp = RESOURCE_PERMISSIONS[resource];
  if (!rp || !rp[action]) return false;
  return rp[action].includes(normalizeLevel(user.level));
}

module.exports = {
  EMPLOYEE_RULES,
  PERMISSION_LEVELS,
  DEPARTMENT_PERMISSIONS,
  validateEmployeeFormat,
  inferDepartmentFromEmployee,
  determinePermissionLevel,
  hasPermission,
  canAccessResource,
};
