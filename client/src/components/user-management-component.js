import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import AuthService from "../services/auth.service";

const UserManagementComponent = () => {
  const { currentUser, hasPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const permissionLevels = [
    { value: "normal", label: "一般使用者 (Normal)" },
    { value: "admin", label: "管理員 (Admin)" },
  ];

  useEffect(() => {
    // 所有登入用戶都可以查看，不需要特殊權限檢查
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await AuthService.getAllUsers();
      // 處理新的 API 響應格式
      const userData = response.data.data || response.data;
      setUsers(userData);
      setMessage("");
    } catch (error) {
      console.error("獲取用戶列表失敗:", error);
      console.error("Error response:", error.response);
      console.error("Error status:", error.response?.status);
      console.error("Error data:", error.response?.data);

      let errorMessage = "無法載入用戶列表";
      if (error.response?.status === 401) {
        errorMessage = "認證失敗，請重新登入";
      } else if (error.response?.status === 403) {
        errorMessage = "權限不足，需要管理員權限";
      } else if (error.response?.data?.msg) {
        errorMessage = error.response.data.msg;
      }

      setMessage(errorMessage);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleEditPermission = (user) => {
    setEditingUser({ ...user });
  };

  const handleSavePermission = async () => {
    try {
      const response = await AuthService.updateUser(editingUser.employee, {
        level: editingUser.level,
      });

      // 處理新的 API 響應格式
      const responseData = response.data;
      if (responseData.success) {
        setMessage(responseData.msg || "權限更新成功");
        setMessageType("success");
        setEditingUser(null);
        fetchUsers(); // 重新載入用戶列表

        // 3秒後清除訊息
        setTimeout(() => {
          setMessage("");
        }, 3000);
      } else {
        setMessage(responseData.msg || "更新權限失敗");
        setMessageType("error");
      }
    } catch (error) {
      console.error("更新權限失敗:", error);
      setMessage(error.response?.data?.msg || "更新權限失敗");
      setMessageType("error");
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
  };

  const handleLevelChange = (newLevel) => {
    setEditingUser({ ...editingUser, level: newLevel });
  };

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "300px" }}
      >
        <div className="spinner-border" role="status">
          <span className="visually-hidden">載入中...</span>
        </div>
      </div>
    );
  }

  // 檢查編輯權限 - 只有 admin 可以編輯權限
  const canEditPermissions = hasPermission("admin");

  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-header">
          <h3 className="mb-0">
            <i className="fas fa-users me-2"></i>
            人員管理
          </h3>
          <small className="text-muted">管理系統用戶權限</small>
        </div>

        <div className="card-body">
          {message && (
            <div
              className={`alert ${
                messageType === "error" ? "alert-danger" : "alert-success"
              } alert-dismissible fade show`}
            >
              {message}
              <button
                type="button"
                className="btn-close"
                onClick={() => setMessage("")}
              ></button>
            </div>
          )}

          <div className="table-responsive">
            <table className="table table-hover">
              <thead className="table-dark">
                <tr>
                  <th>部門</th>
                  <th>工號</th>
                  <th>名稱</th>
                  <th>Email</th>
                  <th>權限等級</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.department}</td>
                    <td>{user.employee}</td>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>
                      {editingUser && editingUser.id === user.id ? (
                        <select
                          className="form-select form-select-sm"
                          value={editingUser.level}
                          onChange={(e) => handleLevelChange(e.target.value)}
                        >
                          {permissionLevels.map((level) => (
                            <option key={level.value} value={level.value}>
                              {level.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={`badge ${
                            user.level === "admin"
                              ? "bg-danger"
                              : "bg-secondary"
                          }`}
                        >
                          {permissionLevels.find((p) => p.value === user.level)
                            ?.label || user.level}
                        </span>
                      )}
                    </td>
                    <td>
                      {editingUser && editingUser.id === user.id ? (
                        <div className="btn-group btn-group-sm">
                          <button
                            className="btn btn-success"
                            onClick={handleSavePermission}
                          >
                            <i className="fas fa-check me-1"></i>
                            保存
                          </button>
                          <button
                            className="btn btn-secondary"
                            onClick={handleCancelEdit}
                          >
                            <i className="fas fa-times me-1"></i>
                            取消
                          </button>
                        </div>
                      ) : canEditPermissions ? (
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleEditPermission(user)}
                          disabled={user.id === currentUser?.id} // 不能編輯自己的權限
                        >
                          <i className="fas fa-edit me-1"></i>
                          編輯權限
                        </button>
                      ) : (
                        <span className="text-muted small">
                          <i className="fas fa-lock me-1"></i>
                          無編輯權限
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="text-center py-4">
              <p className="text-muted">沒有找到任何用戶</p>
            </div>
          )}
        </div>

        <div className="card-footer text-muted">
          <small>
            <i className="fas fa-info-circle me-1"></i>共 {users.length} 位用戶
            • {canEditPermissions ? '您可以修改權限' : '僅管理員可以修改權限'}
          </small>
        </div>
      </div>
    </div>
  );
};

export default UserManagementComponent;
