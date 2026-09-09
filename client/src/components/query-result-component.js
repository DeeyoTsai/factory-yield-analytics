import React, { act, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import FmaTableElement from "./elements/fma-table-element";
import FmaEchartElement from "./elements/fma-echart-element";
import DefectTableElement from "./elements/defect-table-element";
import DragDropImageTable from "./elements/drag-drop-image-table";
import FmaTextareaElement from "./elements/fma-textarea-element";
import FmaService from "../services/fma.service";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useFma } from "../contexts/FmaContext";

const QueryResultComponent = () => {
  const { currentUser } = useAuth();
  const {
    defectArr,
    setDefectArr,
    othersColSpan,
    setOthersColSpan,
    resetDefectTypes,
  } = useFma();
  const navigate = useNavigate();
  const { state } = useLocation();

  // 所有 hooks 必須在任何 early return 之前調用
  const [emp, setEmp] = useState("");
  const [lot, setLot] = useState("");
  const [line, setLine] = useState("");
  const [product, setProduct] = useState("");
  const [isReadyOnly, setIsReadyOnly] = useState(true);
  const [glassDataSet, setGlassDataSet] = useState("");
  const [dfAvgForBar, setDfAvgForBar] = useState([]);
  const [dfRatioForLine, setDfRatioForLine] = useState([]);
  const [sortedDfArr, setSortedDfArr] = useState([]);
  const [standardRowNum, setStandardRowNum] = useState(0);
  const [datetime, setDatetime] = useState("");
  const [canEdit, setCanEdit] = useState(false); // 是否可以編輯此資料
  let [smlAvg, setSmlAvg] = useState(0.0);
  let [postContent, setPostContent] = useState("");
  const [actionArr, setActionArr] = useState([]);
  const [commentDfArr, setCommentDfArr] = useState([]);
  const [poolImages, setPoolImages] = useState([]);
  const [initialSlots, setInitialSlots] = useState(null);
  const [dragSlots, setDragSlots] = useState({});
  // For edit data and submit changes
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 安全地獲取 state 數據
  const rowData = state?.rowData;
  // console.log(rowData);

  const id = state?.id;
  const queryEmp = state?.queryEmp;
  const queryLot = state?.queryLot;
  const queryLine = state?.queryLine;
  const queryProduct = state?.queryProduct;
  const querySdate = state?.querySdate;
  const queryEdate = state?.queryEdate;

  useEffect(() => {
    if (!rowData || !id) {
      console.warn("缺少rowData 或 id:", { rowData, id });
      return;
    }

    const fetchOutlineData = async () => {
      try {
        // console.log("開始解析 rowData:", rowData);
        // console.log("目標 id:", id);

        let parsedData = JSON.parse(rowData);
        let dataObj = parsedData?.data?.foundData;

        // console.log("解析後的數據:", parsedData);
        // console.log("foundData:", dataObj);

        if (!dataObj || !Array.isArray(dataObj)) {
          console.error("Invalid data format:", parsedData);
          return;
        }

        let found = false;
        dataObj.forEach((e) => {
          // 使用非嚴格相等來比較，因為 id 可能是字符串或數字
          if (e.id == id) {
            // console.log(e);
            setDatetime(new Date(e.datetime).toLocaleString("sv"));
            setEmp(e.emp);
            setLot(e.lot);
            setLine(e.line);
            setProduct(e.product);
            // setPostContent(e.comment);
            // console.log(e.comment);
            const first_start = e.comment.indexOf("(1)");
            const second_start = e.comment.indexOf("(2)");
            const third_start = e.comment.indexOf("(3)");

            const first_set = transDefAction(
              e.comment,
              first_start,
              second_start,
            );
            const second_set = transDefAction(
              e.comment,
              second_start,
              third_start,
            );
            const third_set = transDefAction(
              e.comment,
              third_start,
              e.comment.length,
            );

            setCommentDfArr([first_set[0], second_set[0], third_set[0]]);
            setActionArr([first_set[1], second_set[1], third_set[1]]);

            // setPostContent(e.comment);
            // 檢查編輯權限：Admin 或資料擁有者可以編輯
            const canUserEdit =
              currentUser?.level === "admin" ||
              currentUser?.level === "super" ||
              e.emp === currentUser?.employee;
            setCanEdit(canUserEdit);
            setInitialSlots(e.drag_slots ?? null);

            // console.log(
            //   `找到匹配的記錄: id=${e.id}, emp=${e.emp}, product=${e.product}, canEdit=${canUserEdit}`
            // );
            found = true;
          }
        });

        if (!found) {
          console.warn(`沒有找到 id=${id} 的記錄`);
        }
      } catch (error) {
        console.error("Error parsing rowData:", error);
      }
    };

    const fetchFmatbData = async () => {
      try {
        const data = (await FmaService.queryByOutlineId(id)).data.foundData;
        setGlassDataSet(data);
        setStandardRowNum(data.length);
      } catch (error) {
        console.error("Error fetching fmatb data:", error);
      }
    };

    fetchOutlineData();
    fetchFmatbData();
  }, [rowData, id]);

  // 如果沒有必要的數據，顯示錯誤或重定向
  if (!rowData || !id) {
    return (
      <div style={{ padding: "3rem", textAlign: "center" }}>
        <div className="alert alert-warning">
          <h4>無效的查詢結果</h4>
          <p>請從 FMA 查詢頁面點擊"查詢與編輯"按鈕來查看詳細結果。</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/fmaquery")}
          >
            返回查詢頁面
          </button>
        </div>
      </div>
    );
  }

  const handleEmp = (e) => {
    setEmp(e.target.value);
  };
  const handleLot = (e) => {
    setLot(e.target.value);
  };
  const handleProduct = (e) => {
    setProduct(e.target.value);
  };

  const handleLine = (e) => {
    setLine(e.target.value);
  };
  const handleReadOnly = () => {
    isReadyOnly ? setIsReadyOnly(false) : setIsReadyOnly(true);
  };

  const handleSubmit = async () => {
    // const submitData =
    // console.log(glassDataSet);
    if (isSubmitting) return; //防止重複提交
    setIsSubmitting(true);
    try {
      // 1. 驗證資料完整性
      if (!glassDataSet || glassDataSet.length === 0) {
        alert("沒有資料可以送出");
        return;
      }

      // 2. 驗證編輯權限
      if (!canEdit) {
        alert("您沒有權限編輯此資料");
        return;
      }

      // 3. glassDataSet資料格式驗證和清理
      const cleanedData = glassDataSet.map((glass) => {
        // 移除空值和非數值欄位
        const cleaned = { ...glass };

        // 確保數值欄位為數字類型
        const numericFields = [
          "runder",
          "gunder",
          "bunder",
          "bmwp",
          "rwp",
          "gwp",
          "bwp",
          "rgel",
          "ggel",
          "bgel",
          "rdevabnormal",
          "gdevabnormal",
          "bdevabnormal",
          "rfiber",
          "gfiber",
          "bfiber",
          "bp",
          "bmdirty",
          "repair",
          "abovep",
          "backdirty",
          "dirty",
          "ovendrop",
          "black",
          "s",
          "m",
          "l",
          "sqlId",
        ];
        numericFields.forEach((field) => {
          if (cleaned[field] !== undefined && cleaned[field] !== null) {
            cleaned[field] = Number(cleaned[field]) || 0;
          }
        });

        // 處理 otherdf JSON 結構
        if (cleaned.otherdf && typeof cleaned.otherdf === "object") {
          // cleaned.otherdf = JSON.stringify(cleaned.otherdf);
          // console.log(Object.values(cleaned.otherdf));
          cleaned.otherdf = Object.values(cleaned.otherdf);
          // console.log(cleaned.otherdf);
        }
        return cleaned;
      });

      // 4.準備outline data更新請求
      const parsedData = JSON.parse(rowData);
      let outlineObjs = parsedData?.data?.foundData;
      let updatedOutlineData = {};
      outlineObjs.forEach((e) => {
        if (e.id == id) {
          // console.log(e);
          e.emp = emp;
          e.lot = lot;
          e.line = line;
          e.product = product;
          e.first =
            sortedDfArr[0] + "-" + (dfRatioForLine[0] * 100).toFixed(1) + "%";
          e.second =
            sortedDfArr[1] + "-" + (dfRatioForLine[1] * 100).toFixed(1) + "%";
          e.third =
            sortedDfArr[2] + "-" + (dfRatioForLine[2] * 100).toFixed(1) + "%";
          e.updatedAt = new Date(datetime).toLocaleString("sv");
          e.datetime = new Date(datetime).toLocaleString("sv");
          e.comment = postContent;
          e.drag_slots = dragSlots;
          // console.log(e);
          // console.log(postContent);

          updatedOutlineData = { ...e };
        }
      });

      // console.log(updatedOutlineData);

      // 5. 送出outline data、glassDataSet更新請求
      setMessage("正在更新資料...");
      // outline data更新
      // console.log(updatedOutlineData);
      const updateOutlineRes = await FmaService.updateOutline(
        id,
        updatedOutlineData,
      );
      setMessage(updateOutlineRes.data.msg);

      // glassDataSet更新
      const response = await FmaService.updateGlassDataSet(id, cleanedData);
      setMessage(response.data.msg);
      setTimeout(() => {
        setMessage("");
      }, 3000);
    } catch (error) {
      console.error("更新資料時發生錯誤:", error);
      const errorMsg = error.response?.data?.msg || "更新失敗，請稍後再試";
      setMessage(errorMsg);
      setTimeout(() => {
        setMessage("");
      }, 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackQuery = async () => {
    resetDefectTypes();
    setOthersColSpan(5);

    // 將 Date 對象轉換為 YYYY-MM-DD 格式
    const sdateFormatted = new Date(querySdate).toISOString().split("T")[0];
    const edateFormatted = new Date(queryEdate).toISOString().split("T")[0];

    let response = await FmaService.query(
      queryEmp,
      queryLot,
      queryLine,
      queryProduct,
      sdateFormatted,
      edateFormatted,
    );

    response.data.foundData.forEach((e)=>{
      if (e.id == id) {
        e.drag_slots = dragSlots;
      }
    })
    
    navigate("/fmaquery", {
      state: { rowData: JSON.stringify(response) },
    });
  };

  function transDefAction(com, start, end) {
    if (start < 0) {
      return [[], []];
    }
    if (end < 0) {
      end = com.length;
    }
    const sentence = com.slice(start, end);
    const df_stop = sentence.indexOf("佔");
    // console.log(first_sentence.replace(/\n|\r/g, ""));
    const defect = sentence.slice(3, df_stop).trim();
    // console.log(defect);
    const action_start = sentence.indexOf("%");
    let action;
    if (sentence.includes("--&gt;")) {
      action = sentence.slice(action_start + 7, sentence.length).trim();
    } else action = sentence.slice(action_start + 4, sentence.length).trim();
    // console.log(action);
    return [defect, action];
  }

  return (
    <div>
      {/* {JSON.stringify(props.currentUser)} */}
      <div className="fma-check-detail" style={{ padding: "2.5rem" }}>
        <div className="card text-center">
          <h3 className="card-header">FMA Result</h3>
          <div className="card-body mt-2 me-3">
            <div className="mb-3 text-center">
              <label htmlFor="staticEmail" className="text-center fs-4">
                資料更新時間 : {datetime}
              </label>
            </div>
            <div className="d-flex justify-content-center align-items-center mb-2">
              <div id="employee" className="d-flex me-3 w-50">
                <label
                  htmlFor="employee"
                  className="col-sm-1 col-form-label"
                  // style={{ width: "3rem" }}
                >
                  工號:
                </label>
                <input
                  // onChange={handleEmployee}
                  type="text"
                  className="form-control"
                  name="employee"
                  placeholder="請輸入FMA人員工號"
                  onChange={handleEmp}
                  value={emp}
                  readOnly={isReadyOnly}
                  disabled={isReadyOnly}
                />
              </div>
              <div id="lot" className="d-flex w-50">
                <label
                  htmlFor="lot"
                  className="col-sm-1 col-form-label "
                  // style={{ width: "3rem" }}
                >
                  LOT:
                </label>
                <input
                  onChange={handleLot}
                  type="text"
                  className="form-control"
                  name="lot"
                  placeholder="請輸入LOT"
                  value={lot}
                  readOnly={isReadyOnly}
                  disabled={isReadyOnly}
                />
              </div>
            </div>
            <div className="d-flex justify-content-center align-items-center mb-2">
              <div id="line" className="d-flex me-3 w-50">
                <label
                  htmlFor="line"
                  className="col-sm-1 col-form-label"
                  // style={{ width: "3rem" }}
                >
                  產線:
                </label>
                <select
                  onChange={handleLine}
                  className="form-select"
                  value={line}
                  readOnly={isReadyOnly}
                  disabled={isReadyOnly}
                >
                  <option value="DEFAULT" disabled>
                    ---請選擇Line別---
                  </option>
                  <option value="L1">L1</option>
                  <option value="L4">L4</option>
                  <option value="L2">L2</option>
                  <option value="L5">L5</option>
                  <option value="L3">L3</option>
                  <option value="L6">L6</option>
                </select>
              </div>
              <div id="product" className="d-flex w-50">
                <label
                  htmlFor="product"
                  className="col-sm-1 col-form-label"
                  // style={{ width: "3rem" }}
                >
                  品名:
                </label>
                <input
                  onChange={handleProduct}
                  type="text"
                  className="form-control"
                  name="product"
                  placeholder="ex:PNL-B156"
                  value={product}
                  readOnly={isReadyOnly}
                  disabled={isReadyOnly}
                />
              </div>
            </div>
            <div className="d-flex justify-content-center align-items-center mt-4 mb-3">
              {/* <div className="d-flex w-50 justify-content-end me-3"> */}
              {canEdit ? (
                <button
                  className="btn btn-warning btn col-sm-2 me-2"
                  onClick={handleReadOnly}
                >
                  <span>編輯資料{isReadyOnly ? "(OFF)" : "(ON)"}</span>
                </button>
              ) : (
                <div className="text-muted small me-2">
                  <i className="fas fa-lock me-1"></i>
                  僅資料擁有者或管理員可編輯
                </div>
              )}
              {/* <button
                className="btn btn-info btn col-sm-1 me-2"
                onClick={handleSubmit}
              >
                <span>確認送出</span>
              </button> */}
              {/* 修改確認送出按鈕 */}
              <button
                className="btn btn-info btn col-sm-1 me-2"
                onClick={handleSubmit}
                disabled={isSubmitting || !canEdit || isReadyOnly}
              >
                <span>
                  {isSubmitting ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-1"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      更新中...
                    </>
                  ) : (
                    "確認送出"
                  )}
                </span>
              </button>
              <button
                className="btn btn-secondary btn col-sm-1 me-2"
                onClick={handleBackQuery}
              >
                <span>返回上頁</span>
              </button>
              {/* </div> */}
            </div>
          </div>
          {/* 訊息顯示區域 */}
          {message && (
            <div
              className={`alert ${
                message.includes("成功") ? "alert-success" : "alert-danger"
              } text-center mb-3 col-8 mx-auto`}
            >
              {message}
            </div>
          )}
          <div className="card-body text-center">
            {/* {message && <div className="alert alert-danger">{message}</div>} */}

            <FmaTableElement
              currentUser={currentUser}
              employee={emp}
              setEmployee={setEmp}
              line={line}
              setLine={setLine}
              product={product}
              setProduct={setProduct}
              standardRowNum={standardRowNum}
              setStandardRowNum={setStandardRowNum}
              othersColSpan={othersColSpan}
              setOthersColSpan={setOthersColSpan}
              dfAvgForBar={dfAvgForBar}
              setDfAvgForBar={setDfAvgForBar}
              dfRatioForLine={dfRatioForLine}
              setDfRatioForLine={setDfRatioForLine}
              defectArr={defectArr}
              setDefectArr={setDefectArr}
              glassDataSet={glassDataSet}
              setGlassDataSet={setGlassDataSet}
              editable={isReadyOnly}
              setSmlAvg={setSmlAvg}
            />
          </div>
          <div className="card-body pt-2 pb-4">
            <FmaTextareaElement
              postContent={postContent}
              setPostContent={setPostContent}
              line={line}
              product={product}
              sortedDfArr={sortedDfArr}
              dfRatioForLine={dfRatioForLine}
              editable={isReadyOnly}
              smlAvg={smlAvg}
              standardRowNum={standardRowNum}
              actionArr={actionArr}
              setActionArr={setActionArr}
              commentDfArr={commentDfArr}
              // setCommentDfArr={setCommentDfArr}
            />
          </div>
          <div className="card-body pb-4">
            <FmaEchartElement
              dfAvgForBar={dfAvgForBar}
              setDfAvgForBar={setDfAvgForBar}
              dfRatioForLine={dfRatioForLine}
              setDfRatioForLine={setDfRatioForLine}
              defectArr={defectArr}
              product={product}
              sortedDfArr={sortedDfArr}
              setSortedDfArr={setSortedDfArr}
            />
          </div>
          <div className="card-body pt-2 pb-2">
            <DragDropImageTable
              sortedDfArr={sortedDfArr}
              images={poolImages}
              initialSlots={initialSlots}
              onSlotsChange={setDragSlots}
            />
          </div>
          <div className="card-body pt-2 pb-4">
            <DefectTableElement
              defectArr={defectArr}
              glassDataSet={glassDataSet}
              editable={isReadyOnly}
              onImagesLoaded={setPoolImages}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueryResultComponent;
