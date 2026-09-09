import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useFma } from "../contexts/FmaContext";
import "./css/nav-component.css";

const NavComponent = () => {
  const { currentUser, logout, hasPermission, canAccess } = useAuth();
  const { resetDefectTypes, setOthersColSpan } = useFma();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    window.alert("登出成功!現在您會被導向到登入畫面~");
    navigate("/login");
  };

  const handleClear = () => {
    resetDefectTypes();
    setOthersColSpan(5);
  };

  return (
    <div>
      <nav>
        <nav
          className="navbar navbar-expand-lg bg-dark border-bottom border-body"
          data-bs-theme="dark"
        >
          <div className="container-fluid">
            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarNav"
              aria-controls="navbarNav"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon"></span>
            </button>

            <div className="collapse navbar-collapse" id="navbarNav">
              {/* 左側導航選項 */}
              <ul className="navbar-nav me-auto">
                <li className="nav-item me-2 d-flex align-items-center">
                  <Link className="nav-link" to="/">
                    <h5 className="mb-0">首頁</h5>
                  </Link>
                </li>
                {!currentUser && (
                  <li className="nav-item me-2 d-flex align-items-center">
                    <Link className="nav-link" to="/register">
                      <h5 className="mb-0">註冊帳號</h5>
                    </Link>
                  </li>
                )}
                {!currentUser && (
                  <li className="nav-item me-2 d-flex align-items-center">
                    <Link className="nav-link" to="/login">
                      <h5 className="mb-0">登入帳號</h5>
                    </Link>
                  </li>
                )}
                {currentUser && (
                  <li className="nav-item dropdown me-2 d-flex align-items-center">
                    <a
                      className="nav-link dropdown-toggle"
                      href="#"
                      role="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      <h5 className="mb-0 d-inline">FMA系統</h5>
                    </a>
                    <ul className="dropdown-menu">
                      <li>
                        <Link className="dropdown-item" to="/fmaquery">
                          FMA記錄查詢
                        </Link>
                      </li>
                      <li>
                        <Link
                          className="dropdown-item"
                          to="/fmatable"
                          onClick={handleClear}
                        >
                          FMA填寫表格
                        </Link>
                      </li>
                    </ul>
                  </li>
                )}
                {/* 整合新增的良率系統下拉選單 */}
                {currentUser && (
                  <li className="nav-item dropdown me-2 d-flex align-items-center">
                    <a
                      className="nav-link dropdown-toggle"
                      href="#"
                      role="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      <h5 className="mb-0 d-inline">良率系統</h5>
                    </a>
                    <ul className="dropdown-menu">
                      <li>
                        <Link className="dropdown-item" to="/yield-dashboard">
                          Daily Yield
                        </Link>
                      </li>
                      <li>
                        <Link className="dropdown-item" to="/yield-unfinish-lot">
                          未結批良率
                        </Link>
                      </li>
                      <li>
                        <Link className="dropdown-item" to="/yield-eq-actions">
                          排程與機況履歷
                        </Link>
                      </li>
                      <li><hr className="dropdown-divider" /></li>
                      <li>
                        <Link className="dropdown-item" to="/external-links">
                          常用連結
                        </Link>
                      </li>
                    </ul>
                  </li>
                )}
                {currentUser && (
                  <li className="nav-item me-2 d-flex align-items-center">
                    <Link className="nav-link" to="/yield-edc-range">
                      <h5 className="mb-0">EDC 全距監控</h5>
                    </Link>
                  </li>
                )}
                {currentUser && canAccess('user-management', 'read') && (
                  <li className="nav-item me-2 d-flex align-items-center">
                    <Link className="nav-link" to="/users">
                      <h5 className="mb-0">人員管理</h5>
                    </Link>
                  </li>
                )}

              </ul>

              {/* 右側用戶下拉選單 */}
              {currentUser && (
                <ul className="navbar-nav">
                  <li className="nav-item dropdown">
                    <button
                      className="nav-link dropdown-toggle d-flex align-items-center btn border-0 bg-transparent"
                      type="button"
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                    >
                      <i className="fas fa-user-circle me-2"></i>
                      <span>{currentUser.username || currentUser.employee}</span>
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end">
                      <li>
                        <button
                          className="dropdown-item"
                          onClick={handleLogout}
                        >
                          <i className="fas fa-sign-out-alt me-2"></i>
                          登出
                        </button>
                      </li>
                    </ul>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </nav>
      </nav>
    </div>
  );
};

export default NavComponent;
