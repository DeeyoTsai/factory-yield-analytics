// 負責處理登入或登出的服務器
import axios from "axios";
import { API_PREFIX } from "../config/api";

const API_URL = `${API_PREFIX}/user`;

class AuthService {
  login(employee, password) {
    return axios.post(API_URL + "/login", {
      employee,
      password,
    });
  }
  logout() {
    localStorage.removeItem("user");
  }
  async register(department, employee, username, password, email) {
    return await axios.post(API_URL + "/createUser", {
      department,
      employee,
      username,
      password,
      email,
    });
  }
  getCurrentUser() {
    return JSON.parse(localStorage.getItem("user"));
  }

  getAllUsers() {
    let token;
    if (localStorage.getItem("user")) {
      token = JSON.parse(localStorage.getItem("user")).token;
    } else {
      token = "";
    }
    return axios.get(API_URL + "/allUsers", {
      headers: { Authorization: token },
    });
  }

  updateUser(employee, userData) {
    let token;
    if (localStorage.getItem("user")) {
      token = JSON.parse(localStorage.getItem("user")).token;
    } else {
      token = "";
    }
    return axios.patch(API_URL + `/updateUser/${employee}`, userData, {
      headers: { Authorization: token },
    });
  }
}

export default new AuthService();
