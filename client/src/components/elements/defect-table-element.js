import React, {
  useRef,
  useCallback,
  useMemo,
  useState,
  useEffect,
} from "react";

// import {
//   ClientSideRowModelModule,
//   ModuleRegistry,
//   NumberFilterModule,
//   RowDragModule,
//   RowSelectionModule,
//   TextFilterModule,
//   ValidationModule,
// } from "ag-grid-community";

// All Community Features
import {
  AllCommunityModule,
  ModuleRegistry,
  SortIndicatorComp,
  // themeQuartz,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";

// import { useFma } from "../../contexts/FmaContext";
import { useDashboard } from "../../contexts/DashboardContext";

import ImageService from "../../services/image.service";
// import { useFetchJson } from "./fetchTestData";

const DefectTableElement = (props) => {
  ModuleRegistry.registerModules([AllCommunityModule]);
  let [rowData, setRowData] = useState([]);
  const gridRef = useRef(null);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);
  const gridStyle = useMemo(() => ({ height: "100%", width: "100%" }), []);
  const [selectedImage, setSelectedImage] = useState("");

  let dfArrRef = useRef(props.defectArr);

  // Callback for SML data fetched
  const { onSmlDataFetched } = props;

  const { transDefect, labeledDefect } = useDashboard();

  const [colDefs, setColDefs] = useState([
    {
      field: "datetime",
      rowDrag: true,
      headerName: "時間",
      minWidth: 200,
      editable: false,
      // cellStyle: {
      //   display: "flex",
      //   alignItems: "center", // 垂直置中
      //   justifyContent: "center", // 水平置中（可選）
      // },
      // headerClass: "text-center",
      valueGetter: (p) => {
        const dt = p.data?.datetime;
        if (!dt) return "";
        // 支援兩種格式：緊湊 14 碼 YYYYMMDDHHmmss，或已是可解析的日期字串
        const digits = String(dt).replace(/\D/g, "");
        const iso =
          digits.length >= 14
            ? `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)} ` +
              `${digits.slice(8, 10)}:${digits.slice(10, 12)}:${digits.slice(12, 14)}`
            : dt;
        const d = new Date(iso);
        return isNaN(d) ? String(dt) : d.toLocaleString();
      },
    },
    {
      field: "gid",
      headerName: "基板",
      minWidth: 115,
      // editable: false,
      // cellStyle: {
      //   display: "flex",
      //   alignItems: "center", // 垂直置中
      //   justifyContent: "center", // 水平置中（可選）
      // },
    },
    {
      field: "xpos",
      headerName: "X",
      minWidth: 80,
      // editable: false,
      // cellStyle: {
      //   display: "flex",
      //   alignItems: "center", // 垂直置中
      //   justifyContent: "center", // 水平置中（可選）
      // },
    },
    {
      field: "ypos",
      headerName: "Y",
      minWidth: 80,
      // editable: false,
      // cellStyle: {
      //   display: "flex",
      //   alignItems: "center", // 垂直置中
      //   justifyContent: "center", // 水平置中（可選）
      // },
    },
    {
      field: "pred_result",
      headerName: "Predict Defect",
      minWidth: 120,
      editable: false,
      // cellStyle: {
      //   display: "flex",
      //   alignItems: "center", // 垂直置中
      //   justifyContent: "center", // 水平置中（可選）
      // },
      valueGetter: (p) => {
        // pred_result 契約：{ "detections": [ { class, confidence, bbox } ] }
        try {
          const obj = JSON.parse(p.data.pred_result || "{}");
          const dets = Array.isArray(obj.detections) ? obj.detections : [];
          return dets
            .map((d) => {
              const key = labeledDefect[d.class] || d.class;
              return transDefect[key] || key;
            })
            .join(", ");
        } catch (_) {
          return "";
        }
      },
    },
    {
      field: "manual_result",
      headerName: "手動標記",
      cellEditor: "agSelectCellEditor",
      minWidth: 120,
      autoHeight: true,
      wrapText: true,
      // cellEditorParams: function (params) {
      //   return { value: props.defectArr };
      // },
      // cellEditorParams: (params) => {
      //   console.log(params.value);

      //   return {
      //     values: props.defectArr,
      //   };
      // },

      cellEditorParams: () => ({
        values: dfArrRef.current.map((e) =>
          transDefect[e.replaceAll("-", "")]
            ? transDefect[e.replaceAll("-", "")]
            : e.replaceAll("-", "")
        ),
        // value: dfArrRef.current,
      }),
      suppressKeyboardEvent: () => {},
    },
    {
      headerName: "原始圖片",
      field: "ori_img_path",
      minWidth: 260,
      autoHeight: true,
      wrapText: true,
      editable: false,
      // cellRenderer: PredImgRenderer,
      cellRenderer: (params) => {
        let new_str;
        if (params.value.includes("client")) {
          new_str =
            "./" +
            params.value.split("/").slice(3, params.value.length).join("/");
        } else {
          new_str = params.value;
        }
        return (
          <img
            src={new_str}
            alt={`縮圖:${new_str.split("/").slice(-1)[0]}`}
            style={{
              width: "180px",
              // height: "100px",
              cursor: "pointer",
              objectFit: "cover",
              borderRadius: "4px",
            }}
            onClick={() => setSelectedImage(new_str)}
          />
        );
      },
    },
    {
      headerName: "預測圖片",
      field: "pred_img_path",
      minWidth: 260,
      autoHeight: true,
      wrapText: true,
      editable: false,
      // cellRenderer: PredImgRenderer,
      cellRenderer: (params) => {
        let new_str;
        if (params.value.includes("client")) {
          new_str =
            "./" +
            params.value.split("/").slice(3, params.value.length).join("/");
        } else {
          new_str = params.value;
        }

        return (
          <img
            src={new_str}
            alt={`縮圖:${new_str.split("/").slice(-1)[0]}`}
            style={{
              width: "180px",
              // height: "100px",
              cursor: "pointer",
              objectFit: "cover",
              borderRadius: "4px",
            }}
            onClick={() => setSelectedImage(new_str)}
          />
        );
      },
    },
  ]);
  const defaultColDef = useMemo(() => {
    return {
      flex: 1,
      filter: true,
      editable: true,
      cellStyle: {
        display: "flex",
        alignItems: "center", // 垂直置中
        justifyContent: "center", // 水平置中（可選）
      },
    };
  }, []);
  const rowSelection = useMemo(() => {
    return { mode: "multiRow" };
  }, []);

  useEffect(() => {
    dfArrRef.current = [...props.defectArr];
    if (!props.defectArr.includes("")) {
      dfArrRef.current.unshift("");
    }
    // dfArrRef.current.push("null");
    // console.log(dfArrRef);
  }, [props.defectArr]);

  // 目前表格填的 glass id（由 parent 傳入，取代讀 DOM）
  // 新增表單用 props.glassRows；查詢/編輯頁用 props.glassDataSet
  const currentGids = () =>
    (props.glassRows || props.glassDataSet || [])
      .map((r) => String(r.gid || "").trim())
      .filter((g) => g.length > 5);

  // 從 imagetb 回應建 predictMap：{ gid: { <12類欄位 key>: count } }
  const buildPredictMap = (records) => {
    const predictMap = {};
    (records || []).forEach((rec) => {
      const gid = rec.gid;
      if (!gid) return;
      if (!predictMap[gid]) predictMap[gid] = {};
      try {
        const obj = JSON.parse(rec.pred_result || "{}");
        const first = Array.isArray(obj.detections) ? obj.detections[0] : null;
        if (first) {
          const dfField = labeledDefect[first.class];
          if (dfField) predictMap[gid][dfField] = (predictMap[gid][dfField] || 0) + 1;
        }
      } catch (_) {}
    });
    return predictMap;
  };

  const fetchImages = async () => {
    const glasses = currentGids();
    if (glasses.length === 0) return;
    let lotForProduct;
    const sendObj = { [props.line || ""]: glasses };
    try {
      const imgData = await ImageService.queryByGlasses(sendObj);
      const found = imgData.data.foundData ?? [];
      lotForProduct = found.find((f) => f.lot)?.lot;
      setRowData(found);
      props.onImagesLoaded?.(found);
      props.onPredictDataFetched?.(buildPredictMap(found));
    } catch (e) {
      console.log(e.response?.data?.msg || e.message);
      setRowData([]);
      props.onImagesLoaded?.([]);
      // setMessage(imgDataError);
      // messageRef.current = imgDataError;
    }
    // 用 lot 查 EqAction 取得品名。優先用影像記錄自己的 lot 欄位；
    // 沒有才退回「gid 前綴即 lot」的慣例（不同場域 glass id 編碼規則不一定相同）。
    const lot = lotForProduct || glasses[0]?.slice(0, 7);
    try {
      const productObj = await ImageService.queryProductByLot(lot);
      // console.log(productObj);
      // console.log(props.product);
      if(props.product === "") {
        props.setProduct(productObj.data.foundData.product);
      }
    } catch (error) {
      console.log(error);
    }
    // 用產線跟glassid取得sheet data
    try {
      const smlData = await ImageService.querySml(sendObj);
      // console.log(smlData);

      // 將 sml 資料轉換成 Map 格式 { gid: { s, m, l } }
      if (smlData?.data?.getSmlData && onSmlDataFetched) {
        const smlMap = {};
        smlData.data.getSmlData.forEach((item) => {
          smlMap[item.gid] = {
            s: item.s,
            m: item.m,
            l: item.l,
          };
        });
        // 呼叫 callback 將 sml 資料傳回父元件
        onSmlDataFetched(smlMap);
      }

    } catch (error) {
      console.log(error);

    }

  };

  // 查詢/編輯頁：glassDataSet 一到就自動抓影像
  useEffect(() => {
    if (Array.isArray(props.glassDataSet) && props.glassDataSet.length > 0) {
      fetchImages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.glassDataSet]);

  const handleDelete = useCallback(async () => {
    const selectedData = gridRef.current.api.getSelectedRows();
    const res = gridRef.current.api.applyTransaction({ remove: selectedData });
    // console.log(res.remove);
    let removeListId = [];
    res.remove.forEach((e) => {
      // console.log(e.data.id);
      removeListId.push(e.data.id);
    });
    // console.log(removeListId);
    // console.log(transDefect);
    try {
      await ImageService.notShowByImgTbID(removeListId);
    } catch (error) {
      console.log(error);
    }
  }, []);

  const handleUpdate = async () => {
    const rowData = [];
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.forEachNode((node) => {
        rowData.push(node);
      });
    }
    // console.log(rowData);
    let dataToUpdate = [];
    rowData.forEach((row) => {
      let rowObj = {};
      // console.log(row.id);
      // console.log(row.rowIndex);
      if (!parseInt(row.id) == row.rowIndex) {
        // console.log(222);
        rowObj.change_pos = true;
      } else {
        rowObj.change_pos = false;
      }
      rowObj.old_pos = parseInt(row.id);
      rowObj.show_pos = row.rowIndex;
      rowObj.id = row.data.id;
      if (row.data.manual_result == null || row.data.manual_result == "") {
        rowObj.change_df_type = false;
      } else {
        rowObj.change_df_type = true;
        rowObj.manual_result = row.data.manual_result;
      }
      dataToUpdate.push(rowObj);
    });
    // console.log(dataToUpdate);

    try {
      const response = await ImageService.updateDefectType(dataToUpdate);
      // console.log(response);
      if (response) {
        window.alert("表單更新成功!");
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div>
      <h4 className="card-title text-center fw-bold">Label幫幫我</h4>
      <div className="btn-gp d-flex mb-2">
        <button
          type="button"
          className="btn btn-warning p-2 m-1"
          onClick={fetchImages}
          disabled={props.editable}
        >
          Refresh
        </button>
        <button
          className="btn btn-danger p-2 m-1"
          onClick={handleDelete}
          disabled={props.editable}
        >
          Delete
        </button>
        <button
          className="btn btn-primary ms-auto p-2 m-1"
          onClick={handleUpdate}
          disabled={props.editable}
        >
          更新表單
        </button>
      </div>
      <div style={{ width: "100%", height: 800 }}>
        <div style={containerStyle}>
          <div style={gridStyle}>
            <AgGridReact
              ref={gridRef}
              rowData={rowData}
              // loading={loading}
              columnDefs={colDefs}
              defaultColDef={defaultColDef}
              rowDragManaged={true}
              rowDragMultiRow={true}
              rowSelection={rowSelection}
            />
          </div>
        </div>
        <div>
          {selectedImage && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 1000,
              }}
              onClick={() => setSelectedImage(null)}
            >
              <img
                src={selectedImage}
                alt="完整圖片"
                style={{
                  maxWidth: "90%",
                  maxHeight: "90vh",
                  objectFit: "contain",
                }}
              />
            </div>
          )}
        </div>
      </div>
      {/* <div>{JSON.stringify(dfArrRef.current)}</div> */}
    </div>
  );
};

export default DefectTableElement;
