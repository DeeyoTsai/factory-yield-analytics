import axios from "axios";
import { API_PREFIX } from "../config/api";

const API_URL = `${API_PREFIX}/fmatable`;

class FmaService {
  query(employee, lot, line, product, sdate, edate) {
    // console.log(employee, dt, line, product);
    let token;
    if (localStorage.getItem("user")) {
      token = JSON.parse(localStorage.getItem("user")).token;
    } else {
      token = "";
    }

    return axios.get(
      API_URL + `/${employee}_${lot}_${line}_${product}_${sdate}_${edate}`,
      {
        headers: { Authorization: token },
      }
    );
  }
  queryByOutlineId(id) {
    let token;
    if (localStorage.getItem("user")) {
      token = JSON.parse(localStorage.getItem("user")).token;
    } else {
      token = "";
    }
    // console.log(id);
    return axios.get(API_URL + `/glassDataSet/${id}`, {
      headers: { Authorization: token },
    });
  }
  addOutline(outlineData) {
    let token;
    if (localStorage.getItem("user")) {
      token = JSON.parse(localStorage.getItem("user")).token;
    } else {
      token = "";
    }
    return axios.post(
      API_URL + "/fmaOutline",
      {
        outlineData,
      },
      {
        headers: { Authorization: token },
      }
    );
  }
  deleteOutlineRow(id) {
    let token;
    if (localStorage.getItem("user")) {
      token = JSON.parse(localStorage.getItem("user")).token;
    } else {
      token = "";
    }
    // console.log(`/fmaOutlineRow/${id}`);
    return axios.delete(API_URL + `/fmaOutlineRow/${id}`, {
      headers: { Authorization: token },
    });
  }
  updateOutline(outlineId, newOutlineRow) {
    let token;
    if (localStorage.getItem("user")) {
      token = JSON.parse(localStorage.getItem("user")).token;
    } else {
      token = "";
    }

    return axios.put(
      API_URL + `/fmaOutlineRow/${outlineId}`,
      { newOutlineRow },
      {
        headers: { Authorization: token },
      }
    );
  }

  addGlasses(employee, sheetDataSet) {
    let token;
    if (localStorage.getItem("user")) {
      token = JSON.parse(localStorage.getItem("user")).token;
    } else {
      token = "";
    }
    return axios.post(
      API_URL + "/glassDataSet",
      { employee, sheetDataSet },
      {
        headers: { Authorization: token },
      }
    );
  }

  // Dashboard 數據查詢API
  getDashboardData(startDate, endDate) {
    let token;
    if (localStorage.getItem("user")) {
      token = JSON.parse(localStorage.getItem("user")).token;
    } else {
      token = "";
    }

    // 使用空字串作為預設值來獲取所有數據，只篩選日期
    return axios.get(API_URL + `/____${startDate}_${endDate}`, {
      headers: { Authorization: token },
    });
  }

  // 獲取統計數據
  getStatistics(startDate, endDate) {
    let token;
    if (localStorage.getItem("user")) {
      token = JSON.parse(localStorage.getItem("user")).token;
    } else {
      token = "";
    }

    return axios.get(API_URL + `/statistics/${startDate}/${endDate}`, {
      headers: { Authorization: token },
    });
  }

  updateGlassDataSet(outlineId, glassDataSet) {
    let token;
    if (localStorage.getItem("user")) {
      token = JSON.parse(localStorage.getItem("user")).token;
    } else {
      token = "";
    }
    return axios.put(
      API_URL + `/glassDataSet/${outlineId}`,
      { glassDataSet },
      {
        headers: { Authorization: token },
      }
    );
  }
}

export default new FmaService();
