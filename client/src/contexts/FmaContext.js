import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import FmaService from "../services/fma.service";
import { DEFECT_TYPES } from "../config/defectTypes";

const FmaContext = createContext();

// FMA 表單的缺陷欄位 = 12 類（用 label 當顯示名）。
// ⚠️ fma-table-element.js 的表格 <td> 目前仍是舊 24 欄硬編，
// 完整改成 12 欄動態表格是「YOLO × FMA 整合」階段的工作。
const DEFAULT_DEFECT_ARR = DEFECT_TYPES.map((d) => d.label);

export const useFma = () => {
  const context = useContext(FmaContext);
  if (!context) {
    throw new Error("useFma must be used within an FmaProvider");
  }
  return context;
};

export const FmaProvider = ({ children }) => {
  // 缺陷類型數組（12 類 label）
  const [defectArr, setDefectArr] = useState([...DEFAULT_DEFECT_ARR]);
  // let defectArrRef = useRef(defectArr);
  // 其他欄位的合併span
  const [othersColSpan, setOthersColSpan] = useState(5);

  // 查詢相關狀態
  const [queryData, setQueryData] = useState([]);
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState(null);

  // 表單相關狀態
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);

  // FMA table data
  // const [tableData, setTableData] = useState([]);

  // 查詢FMA數據
  const queryFmaData = useCallback(async (queryParams) => {
    setQueryLoading(true);
    setQueryError(null);

    try {
      const { employee, lot, line, product, startDate, endDate } = queryParams;
      const response = await FmaService.query(
        employee,
        lot,
        line,
        product,
        startDate,
        endDate
      );
      setQueryData(response.data.foundData || []);
      return { success: true, data: response.data.foundData };
    } catch (error) {
      const errorMessage = error.response?.data?.msg || "查詢失敗";
      setQueryError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setQueryLoading(false);
    }
  }, []);

  // 根據OutlineId查詢詳細數據
  const queryByOutlineId = useCallback(async (outlineId) => {
    setQueryLoading(true);
    setQueryError(null);

    try {
      const response = await FmaService.queryByOutlineId(outlineId);
      return { success: true, data: response.data.foundData };
    } catch (error) {
      const errorMessage = error.response?.data?.msg || "查詢詳細資料失敗";
      setQueryError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setQueryLoading(false);
    }
  }, []);

  // 新增Outline資料
  const addOutline = useCallback(async (outlineData) => {
    setFormLoading(true);
    setFormError(null);

    try {
      const response = await FmaService.addOutline(outlineData);
      return { success: true, data: response.data.savedFmaOutline };
    } catch (error) {
      const errorMessage = error.response?.data?.msg || "新增Outline失敗";
      setFormError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setFormLoading(false);
    }
  }, []);

  // 刪除Outline資料
  const deleteOutline = useCallback(async (outlineId) => {
    setFormLoading(true);
    setFormError(null);

    try {
      const response = await FmaService.deleteOutlineRow(outlineId);
      return { success: true, message: response.data.msg };
    } catch (error) {
      const errorMessage = error.response?.data?.msg || "刪除Outline失敗";
      setFormError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setFormLoading(false);
    }
  }, []);

  // 新增多筆Glass數據
  const addGlassDataSet = useCallback(async (employee, sheetDataSet) => {
    setFormLoading(true);
    setFormError(null);

    try {
      const response = await FmaService.addGlasses(employee, sheetDataSet);
      return { success: true, data: response.data.savedGlasses };
    } catch (error) {
      const errorMessage = error.response?.data?.msg || "新增Glass資料失敗";
      setFormError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setFormLoading(false);
    }
  }, []);

  // 添加缺陷類型
  const addDefectType = useCallback(
    (defectType) => {
      if (!defectArr.includes(defectType)) {
        setDefectArr((prev) => [...prev, defectType]);
      }
    },
    [defectArr]
  );

  // 移除缺陷類型
  const removeDefectType = useCallback((defectType) => {
    setDefectArr((prev) => prev.filter((item) => item !== defectType));
  }, []);

  // 重置缺陷類型到預設值
  const resetDefectTypes = useCallback(() => {
    setDefectArr([
      "r-under",
      "g-under",
      "b-under",
      "bm-wp",
      "r-wp",
      "g-wp",
      "b-wp",
      "r-gel",
      "g-gel",
      "b-gel",
      "r-resist-small",
      "g-resist-small",
      "b-resist-small",
      "r-fiber",
      "g-fiber",
      "b-fiber",
      "bp",
      "bm-dirty",
      "repair",
      "above-p",
      "back-dirty",
      "dirty",
      "oven-drop",
      "black",
    ]);
  }, []);

  // 清除查詢錯誤
  const clearQueryError = useCallback(() => {
    setQueryError(null);
  }, []);

  // 清除表單錯誤
  const clearFormError = useCallback(() => {
    setFormError(null);
  }, []);

  // 清除查詢數據
  const clearQueryData = useCallback(() => {
    setQueryData([]);
  }, []);

  // FMA table data 初始化資料
  // let initObj = {
  //   id: "",
  //   date: "",
  //   gid: "",
  // };

  // defectArr.slice(0, 24).map((e, i) => (initObj[e?.replaceAll("-", "")] = ""));
  // initObj["s"] = "";
  // initObj["m"] = "";
  // initObj["l"] = "";
  // initObj["createdAt"] = "";
  // initObj["updatedAt"] = "";
  // initObj["outlineId"] = "";
  // initObj["otherdf"] = {};

  // const initTableData = () => {
  //   let initArr = [];
  //   for (let i = 0; i < standardRowNum; i++) {
  //     // console.log(Object.keys(initObj).length);
  //     // let cpObj = { ...initObj };
  //     let cpObj = JSON.parse(JSON.stringify(initObj));
  //     cpObj.id = i;
  //     initArr.push(cpObj);
  //   }

  //   return initArr;
  // };

  

  const value = {
    // 配置狀態
    defectArr,
    // defectArrRef,
    othersColSpan,
    setOthersColSpan,

    // 查詢相關
    queryData,
    queryLoading,
    queryError,
    queryFmaData,
    queryByOutlineId,
    clearQueryError,
    clearQueryData,

    // 表單相關
    formLoading,
    formError,
    addOutline,
    deleteOutline,
    addGlassDataSet,
    clearFormError,

    // 缺陷類型管理
    addDefectType,
    removeDefectType,
    resetDefectTypes,
    setDefectArr,

    // FMA TABLE DATA
    // tableData,
    // setTableData,
  };

  return <FmaContext.Provider value={value}>{children}</FmaContext.Provider>;
};

export default FmaContext;
