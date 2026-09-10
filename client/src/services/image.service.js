import axios from "axios";
import { API_PREFIX } from "../config/api";

const API_URL = `${API_PREFIX}/imgtable`;

class ImageService {
  queryByGlasses(gls_lst) {
    let token;
    if (localStorage.getItem("user")) {
      token = JSON.parse(localStorage.getItem("user")).token;
    } else {
      token = "";
    }

    // console.log(gls_lst);
    const line = Object.keys(gls_lst)[0];
    const glasses = Object.values(gls_lst)[0];

    return axios.get(
      API_URL + `/queryByGlasses`,
      {
        params: {
          line,
          items: glasses,
        },
      },
      {
        headers: { Authorization: token },
      }
    );
  }
  // Demo 用：取幾個確定有影像的 glass id（接自己資料流後後端可移除，前端會自動不顯示）
  demoGlasses(limit = 5) {
    return axios.get(API_URL + `/demoGlasses`, { params: { limit } });
  }
  notShowByImgTbID(id_list) {
    let token;
    if (localStorage.getItem("user")) {
      token = JSON.parse(localStorage.getItem("user")).token;
    } else {
      token = "";
    }
    console.log(id_list);
    return axios.get(
      API_URL + `/deleteRows`,
      {
        params: {
          id_list,
        },
      },
      {
        headers: { Authorization: token },
      }
    );
  }
  updateDefectType(rowData) {
    let token;
    if (localStorage.getItem("user")) {
      token = JSON.parse(localStorage.getItem("user")).token;
    } else {
      token = "";
    }
    const emp = JSON.parse(localStorage.getItem("user")).employee;

    return axios.patch(
      API_URL + `/updateDefectType`,
      {
        rowData,
        emp,
      },
      {
        headers: { Authorization: token },
      }
    );
  }

  getHealthCondition() {
    let token;
    if (localStorage.getItem("user")) {
      token = JSON.parse(localStorage.getItem("user")).token;
    } else {
      token = "";
    }
    return axios.get(API_URL + `/getHealthCondition`, {
      headers: { Authorization: token },
    });
  }

  getModelMtime() {
    let token;
    if (localStorage.getItem("user")) {
      token = JSON.parse(localStorage.getItem("user")).token;
    } else {
      token = "";
    }
    return axios.get(API_URL + `/model-info`, {
      headers: { Authorization: token },
    });
  }

  queryProductByLot(lot) {
    // console.log(lot);
    
    let token;
    if (localStorage.getItem("user")) {
      token = JSON.parse(localStorage.getItem("user")).token;
    } else {
      token = "";
    }
    // /queryProductByLot
    return axios.get(API_URL + `/queryProductByLot`, {
      params: {
        lot,
      },
      headers: { Authorization: token },
    });
  }

  querySml(ln_gls) {
    let token;
    if (localStorage.getItem("user")) {
      token = JSON.parse(localStorage.getItem("user")).token;
    } else {
      token = "";
    }
    
    const ln = Object.keys(ln_gls)[0];
    const gls_arr = Object.values(ln_gls)[0];
    
    return axios.get(API_URL + `/querySmlByLineGls`, 
    {
      params:{
        ln,
        gls_arr
      },
    },
    {
      headers:{ Authorization: token }
    });
  }
}

export default new ImageService();
