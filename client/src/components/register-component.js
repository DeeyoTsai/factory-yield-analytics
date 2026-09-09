import React, { useState } from "react";
import AuthService from "../services/auth.service";
import { useNavigate } from "react-router-dom";

const RegisterComponent = () => {
  const navigate = useNavigate();
  let [department, setDepartment] = useState("");
  let [employee, setEmplyee] = useState("");
  let [username, setUsername] = useState("");
  let [password, setPassword] = useState("");
  let [email, setEmail] = useState("");
  let [message, setMessage] = useState("");

  const handleDepartment = (e) => {
    setDepartment(e.target.value.toUpperCase());
  };

  const handleEmployee = (e) => {
    setEmplyee(e.target.value);
  };
  const handleUsername = (e) => {
    setUsername(e.target.value);
  };
  const handlePassword = (e) => {
    setPassword(e.target.value);
  };

  const handleEmail = (e) => {
    setEmail(e.target.value);
  };

  const handleRegister = () => {
    // console.log(department, employee, username, password, email);

    AuthService.register(department, employee, username, password, email)
      .then(() => {
        window.alert("註冊成功!!您現在將被導向登入頁面");
        navigate("/login");
      })
      .catch((e) => {
        console.log(e);
        if (e.response && e.response.data && e.response.data.msg) {
          setMessage(e.response.data.msg);
        } else {
          setMessage("註冊失敗，請稍後重試或聯繫管理員");
        }
      });
  };

  return (
    // Error message
    <div style={{ padding: "3rem" }} className="col-md-12">
      {message && <div className="alert alert-danger">{message}</div>}
      <div>
        <div>
          <label htmlFor="department">部門:</label>
          <input
            onChange={handleDepartment}
            type="text"
            className="form-control"
            name="department"
            placeholder="部門代碼，例 QA / MFG / ENG"
          />
        </div>
        <br />
        <div>
          <label htmlFor="employee">工號:</label>
          <input
            onChange={handleEmployee}
            type="text"
            className="form-control"
            name="employee"
            placeholder="工號長度必須在6-10位之間"
          />
        </div>
        <br />
        <div>
          <label htmlFor="username">用戶名稱:</label>
          <input
            onChange={handleUsername}
            type="text"
            className="form-control"
            name="username"
          />
        </div>
        <br />
        <div className="form-group">
          <label htmlFor="password">密碼：</label>
          <input
            onChange={handlePassword}
            type="password"
            className="form-control"
            name="password"
            placeholder="密碼長度至少6位英文或數字"
          />
        </div>
        <br />
        <div className="form-group">
          <label htmlFor="email">電子信箱：</label>
          <input
            onChange={handleEmail}
            type="text"
            className="form-control"
            name="email"
            placeholder="請輸入正確的email格式"
          />
        </div>

        {/* <div className="form-group">
          <label htmlFor="password">身份：</label>
          <input
            type="text"
            className="form-control"
            placeholder="只能填入student或是instructor這兩個選項其一"
            name="role"
          />
        </div> */}
        <br />
        <button onClick={handleRegister} className="btn btn-primary">
          <span>註冊帳號</span>
        </button>
      </div>
    </div>
  );
};

export default RegisterComponent;
