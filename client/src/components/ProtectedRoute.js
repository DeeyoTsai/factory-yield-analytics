import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * 受保護路由組件
 * 用於保護需要特定權限的頁面
 */
const ProtectedRoute = ({
  children,
  requiredPermission = "normal",
  requiredDepartment = null,
  redirectTo = "/login",
  showUnauthorized = false,
}) => {
  const { currentUser, loading, isAuthenticated, hasPermission } = useAuth();
  const location = useLocation();

  // 還在從 localStorage 還原登入狀態——先別判斷也別跳轉，
  // 否則硬重新整理受保護頁面會在 currentUser 載入前就被踢回登入頁。
  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">載入中...</span>
        </div>
      </div>
    );
  }

  // 檢查是否已登入
  if (!isAuthenticated()) {
    // 保存當前路徑，登入後重定向回來
    return (
      <Navigate to={redirectTo} state={{ from: location.pathname }} replace />
    );
  }

  // 檢查權限等級
  if (!hasPermission(requiredPermission)) {
    if (showUnauthorized) {
      return <UnauthorizedAccess requiredPermission={requiredPermission} />;
    }
    return <Navigate to="/" replace />;
  }

  // 檢查部門權限
  if (
    requiredDepartment &&
    !checkDepartmentAccess(currentUser.department, requiredDepartment)
  ) {
    if (showUnauthorized) {
      return <UnauthorizedAccess requiredDepartment={requiredDepartment} />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

/**
 * 檢查部門權限
 * @param {string} userDepartment 用戶部門
 * @param {string|Array} requiredDepartment 需要的部門
 * @returns {boolean} 是否有權限
 */
const checkDepartmentAccess = (userDepartment, requiredDepartment) => {
  if (Array.isArray(requiredDepartment)) {
    return requiredDepartment.includes(userDepartment);
  }
  return userDepartment === requiredDepartment;
};

/**
 * 無權限訪問提示組件
 */
const UnauthorizedAccess = ({ requiredPermission, requiredDepartment }) => {
  const { currentUser } = useAuth();

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card border-danger">
            <div className="card-header bg-danger text-white">
              <h4 className="mb-0">⚠️ 存取被拒絕</h4>
            </div>
            <div className="card-body">
              <p className="card-text">抱歉，您沒有權限訪問此頁面。</p>

              <div className="mb-3">
                <strong>您的資訊：</strong>
                <ul className="list-unstyled mt-2">
                  <li>👤 工號: {currentUser?.employee}</li>
                  <li>🏢 部門: {currentUser?.department}</li>
                  <li>🔑 權限等級: {currentUser?.level}</li>
                </ul>
              </div>

              {requiredPermission && (
                <div className="mb-3">
                  <strong>所需權限等級：</strong>
                  <span className="badge bg-warning ms-2">
                    {requiredPermission}
                  </span>
                </div>
              )}

              {requiredDepartment && (
                <div className="mb-3">
                  <strong>限制部門：</strong>
                  <span className="badge bg-info ms-2">
                    {Array.isArray(requiredDepartment)
                      ? requiredDepartment.join(", ")
                      : requiredDepartment}
                  </span>
                </div>
              )}

              <div className="d-grid gap-2">
                <button
                  className="btn btn-primary"
                  onClick={() => window.history.back()}
                >
                  返回上一頁
                </button>
                <a href="/" className="btn btn-outline-secondary">
                  回首頁
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 管理員專用路由
 */
export const AdminRoute = ({ children, ...props }) => (
  <ProtectedRoute requiredPermission="admin" showUnauthorized={true} {...props}>
    {children}
  </ProtectedRoute>
);

/**
 * 一般用戶路由（保留向後相容）
 */
export const SupervisorRoute = ({ children, ...props }) => (
  <ProtectedRoute
    requiredPermission="normal"
    showUnauthorized={true}
    {...props}
  >
    {children}
  </ProtectedRoute>
);

/**
 * 一般用戶路由（保留向後相容）
 */
export const ManagerRoute = ({ children, ...props }) => (
  <ProtectedRoute
    requiredPermission="normal"
    showUnauthorized={true}
    {...props}
  >
    {children}
  </ProtectedRoute>
);

/**
 * 部門限制路由
 */
export const DepartmentRoute = ({ department, children, ...props }) => (
  <ProtectedRoute
    requiredDepartment={department}
    showUnauthorized={true}
    {...props}
  >
    {children}
  </ProtectedRoute>
);

/**
 * 條件權限檢查Hook - 簡化權限系統
 */
export const usePermissionCheck = () => {
  const { currentUser, hasPermission } = useAuth();

  return {
    canRead: (resource) => hasPermission("normal"), // 基本讀取權限
    canWrite: (resource) =>
      resource === "user-management"
        ? hasPermission("admin")
        : hasPermission("normal"), // 用戶管理寫入需要admin權限
    canDelete: (resource) =>
      resource === "user-management"
        ? hasPermission("admin")
        : hasPermission("normal"), // 用戶管理刪除需要admin權限
    canManage: (resource) => hasPermission("admin"), // 管理需要管理員權限
    canAdmin: (resource) => hasPermission("admin"), // 系統管理需要管理員權限
    isDepartment: (dept) => currentUser?.department === dept,
    isOwner: (resourceEmployee) => currentUser?.employee === resourceEmployee,
  };
};

export default ProtectedRoute;
