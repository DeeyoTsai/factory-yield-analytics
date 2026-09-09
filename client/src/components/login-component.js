import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import userImage from "./images/profile.gif";
import axios from "axios";
import { API_PREFIX } from "../config/api";

const LoginComponent = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  let [employee, setEmplyee] = useState("");
  let [password, setPassword] = useState("");
  let [message, setMessage] = useState("");

  const handleEmployee = (e) => {
    setEmplyee(e.target.value);
  };
  const handlePassword = (e) => {
    setPassword(e.target.value);
  };
  const handleResetPassword = async () => {
    const inputEmployee = window.prompt("請輸入您的工號：");
    if (!inputEmployee) return;
    const confirmed = window.confirm(`確認要將工號 "${inputEmployee}" 的密碼重置為工號嗎？`);
    if (!confirmed) return;
    try {
      const res = await axios.post(`${API_PREFIX}/user/resetPassword`, { employee: inputEmployee });
      setMessage(res.data.msg);
      setTimeout(() => setMessage(""), 3000);
    } catch (e) {
      const errMsg = e.response?.data?.msg || "重置失敗，請稍後再試";
      setMessage(errMsg);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const doLogin = async (emp, pwd) => {
    const result = await login(emp, pwd);
    if (result.success) {
      navigate("/");
    } else {
      setMessage(result.error || "登入失敗");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleLogin = () => doLogin(employee, password);
  const handleDemoLogin = () => doLogin("E-1001", "demo1234");

  return (
    <div style={{ padding: "3rem" }} className="col-md-12">
      <div>
        {message && <div className="alert alert-danger">{message}</div>}
        <div className="container py-5 h-100">
          <div className="row d-flex justify-content-center align-items-center h-100">
            <div className="col-12 col-md-8 col-lg-6 col-xl-5">
              <div
                className="card shadow-2-strong"
                style={{ borderRadius: "1rem" }}
              >
                <div className="card-body p-5 text-center">
                  <img
                    src={userImage}
                    alt="User icon"
                    width={"200px"}
                    // style={{ width: "500px", height: "600px" }}
                  />
                  <h3 className="mb-5">Sign in</h3>
                  <form action="">
                    <div className="form-group form-outline mb-4 d-flex justify-content-center align-items-center">
                      <label htmlFor="employee" style={{ width: "3.5rem" }}>
                        工號：
                      </label>
                      <input
                        onChange={handleEmployee}
                        type="text"
                        className="form-control form-control-lg"
                        name="employee"
                      />
                    </div>
                    <div className="form-group mb-4 d-flex justify-content-center align-items-center">
                      <label htmlFor="password" style={{ width: "3.5rem" }}>
                        密碼：
                      </label>
                      <input
                        onChange={handlePassword}
                        type="password"
                        className="form-control form-control-lg"
                        name="password"
                        autoComplete="on"
                      />
                    </div>
                  </form>
                  <div className="form-check d-flex justify-content-start mb-4">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      value=""
                      id="form1Example3"
                    />
                    <label className="form-check-label" htmlFor="form1Example3">
                      &nbsp; Remember password{" "}
                    </label>
                  </div>

                  <button
                    className="btn btn-primary btn-lg btn-block"
                    type="button"
                    onClick={handleLogin}
                  >
                    登入系統
                  </button>
                  <div className="mt-3">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={handleDemoLogin}
                    >
                      以 Demo 帳號登入（E-1001 / demo1234）
                    </button>
                  </div>
                  <div className="mt-2">
                    <button
                      type="button"
                      className="btn btn-link btn-sm text-muted"
                      onClick={handleResetPassword}
                    >
                      忘記密碼？
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    // <section className="vh-100" style={{ backgroundColor: "#508bfc" }}>
    //   <div className="container py-5 h-100">
    //     <div class="row d-flex justify-content-center align-items-center h-100">
    //       <div class="col-12 col-md-8 col-lg-6 col-xl-5">
    //         <div class="card shadow-2-strong" style={{ borderRadius: "1rem" }}>
    //           <div class="card-body p-5 text-center">
    //             <h3 class="mb-5">Sign in</h3>

    //             <div data-mdb-input-init class="form-outline mb-4">
    //               <input
    //                 type="email"
    //                 id="typeEmailX-2"
    //                 class="form-control form-control-lg"
    //               />
    //               <label class="form-label" for="typeEmailX-2">
    //                 Email
    //               </label>
    //             </div>

    //             <div data-mdb-input-init class="form-outline mb-4">
    //               <input
    //                 type="password"
    //                 id="typePasswordX-2"
    //                 class="form-control form-control-lg"
    //               />
    //               <label class="form-label" for="typePasswordX-2">
    //                 Password
    //               </label>
    //             </div>

    //             {/* <!-- Checkbox --> */}
    //             <div class="form-check d-flex justify-content-start mb-4">
    //               <input
    //                 class="form-check-input"
    //                 type="checkbox"
    //                 value=""
    //                 id="form1Example3"
    //               />
    //               <label class="form-check-label" for="form1Example3">
    //                 {" "}
    //                 Remember password{" "}
    //               </label>
    //             </div>

    //             <button
    //               data-mdb-button-init
    //               data-mdb-ripple-init
    //               class="btn btn-primary btn-lg btn-block"
    //               type="submit"
    //             >
    //               Login
    //             </button>
    //           </div>
    //         </div>
    //       </div>
    //     </div>
    //   </div>
    // </section>
  );
};

export default LoginComponent;
