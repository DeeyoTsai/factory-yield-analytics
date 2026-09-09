import React, { createContext, useContext, useState, useEffect } from "react";
import AuthService from "../services/auth.service";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  // console.log(children);

  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 初始化用戶狀態
  useEffect(() => {
    const storedUser = AuthService.getCurrentUser();
    if (storedUser) {
      // 從 localStorage 中恢復用戶數據，排除 token 避免在 state 中存儲敏感信息
      const { token, ...userData } = storedUser;
      setCurrentUser(userData);
    }
    setLoading(false);
  }, []);

  // 登入函數
  const login = async (email, password) => {
    try {
      const response = await AuthService.login(email, password);

      // 將用戶數據和 token 存儲到 localStorage
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...response.data.user,
          token: response.data.token,
        })
      );

      setCurrentUser(response.data.user);
      return { success: true, user: response.data.user };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.msg || "登入失敗",
      };
    }
  };

  // 登出函數
  const logout = () => {
    AuthService.logout();
    setCurrentUser(null);
  };

  // 註冊函數
  const register = async (userData) => {
    try {
      const response = await AuthService.register(userData);
      return { success: true, message: response.data.msg };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.msg || "註冊失敗",
      };
    }
  };

  // 檢查是否已登入
  const isAuthenticated = () => {
    return currentUser !== null;
  };

  // 權限等級映射 - 簡化為兩個等級
  const PERMISSION_HIERARCHY = {
    normal: 1,
    admin: 2,
    // 保留舊系統相容性
    operator: 1,
    supervisor: 1,
    manager: 1,
    super: 2,
  };

  // 檢查用戶權限
  const hasPermission = (requiredLevel = "normal") => {
    if (!currentUser || !currentUser.level) return false;

    const userLevel = PERMISSION_HIERARCHY[currentUser.level] || 1;
    const requiredLevelNum = PERMISSION_HIERARCHY[requiredLevel] || 1;

    return userLevel >= requiredLevelNum;
  };

  // 檢查資源存取權限 - 簡化權限系統
  const canAccess = (resource, action = "read") => {
    if (!currentUser) return false;

    // 管理員可以訪問所有資源
    if (currentUser.level === "admin" || currentUser.level === "super")
      return true;

    // 簡化權限系統 - 所有一般用戶都能使用基本功能
    const permissions = {
      dashboard: {
        read: ["normal", "operator", "supervisor", "manager"],
        write: ["normal", "operator", "supervisor", "manager"],
      },
      "fma-table": {
        read: ["normal", "operator", "supervisor", "manager"],
        write: ["normal", "operator", "supervisor", "manager"],
        delete: ["normal", "operator", "supervisor", "manager"],
      },
      reports: {
        read: ["normal", "operator", "supervisor", "manager"],
        export: ["normal", "operator", "supervisor", "manager"],
      },
      "user-management": {
        read: ["normal", "operator", "supervisor", "manager", "admin", "super"],
        write: ["admin", "super"],
        delete: ["admin", "super"],
      },
    };

    const resourcePermissions = permissions[resource];
    if (!resourcePermissions || !resourcePermissions[action]) return false;

    return resourcePermissions[action].includes(currentUser.level);
  };

  // 檢查部門權限
  const isDepartment = (department) => {
    if (!currentUser) return false;
    if (Array.isArray(department)) {
      return department.includes(currentUser.department);
    }
    return currentUser.department === department;
  };

  // 檢查是否為資源擁有者
  const isResourceOwner = (resourceEmployee) => {
    if (!currentUser) return false;
    return currentUser.employee === resourceEmployee;
  };

  // 檢查是否可以管理用戶 - 只有 admin 可以管理
  const canManageUser = (targetUser) => {
    if (!currentUser) return false;

    // 只有管理員可以管理用戶，移除舊系統相容性
    return currentUser.level === "admin";
  };

  const value = {
    currentUser,
    loading,
    login,
    logout,
    register,
    isAuthenticated,
    hasPermission,
    canAccess,
    isDepartment,
    isResourceOwner,
    canManageUser,
    setCurrentUser, // 保留直接設置功能，以防其他組件需要
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
