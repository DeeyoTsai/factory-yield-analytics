import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import axios from "axios";
import { API_BASE_URL } from "./config/api";
import "./components/css/index-page.css";

axios.defaults.baseURL = API_BASE_URL;

// 全域 Axios 攔截器，自動補上 JWT Token
axios.interceptors.request.use(
  (config) => {
    if (localStorage.getItem("user")) {
      const user = JSON.parse(localStorage.getItem("user"));
      if (user && user.token) {
        config.headers.Authorization = user.token;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
