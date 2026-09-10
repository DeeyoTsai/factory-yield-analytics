import { useState, useRef, useEffect } from "react";
// import "../css/query-form-element.css";S
import FmaTableElement from "./fma-table-element";
import FmaEchartElement from "./fma-echart-element";
import DefectTableElement from "./defect-table-element";
import DragDropImageTable from "./drag-drop-image-table";
import { useNavigate } from "react-router-dom";
import FmaService from "../../services/fma.service";
import ImageService from "../../services/image.service";
// import fmaService from "../../services/fma.service";
// import ImageService from "../../services/image.service";
import FmaTextareaElement from "./fma-textarea-element";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../css/DatePickerStyles.css";
import { DEFECT_KEYS } from "../../config/defectTypes";

const QueryFormComponent = (props) => {
  const navigate = useNavigate();
  const oriDbDefect = DEFECT_KEYS; // 12 類缺陷欄位（config/defectTypes.js）

  let [standardRowNum, setStandardRowNum] = useState(5);
  const [glassRows, setGlassRows] = useState([]); // FmaTableElement 同步回來的目前列資料
  const [customColNames, setCustomColNames] = useState([]);
  let [smlAvg, setSmlAvg] = useState(0.0);
  // let [othersColSpan, setOthersColSpan] = useState(5);
  // For barChart --> all Total Num data
  let [dfAvgForBar, setDfAvgForBar] = useState([]);
  // For lineChart --> all Avg Num data
  let [dfRatioForLine, setDfRatioForLine] = useState([]);
  let [sortedDfArr, setSortedDfArr] = useState([]);
  // 與 sortedDfArr 索引一一對應的 ratio（由 FmaEchartElement 排序後回傳）。
  // 不可以直接用 dfRatioForLine —— 那是「欄位順序」的，不是排序後的。
  const [sortedRatios, setSortedRatios] = useState([]);
  // const sortedDfArrRef = useRef(sortedDfArr);
  let [message, setMessage] = useState("");
  let messageRef = useRef(message);
  let [isReadyOnly, setIsReadyOnly] = useState(false);
  let [postContent, setPostContent] = useState("");
  const [actionArr, setActionArr] = useState([]);
  const [smlMap, setSmlMap] = useState({});
  const [poolImages, setPoolImages] = useState([]);
  const [dragSlots, setDragSlots] = useState({});
  const [predictMap, setPredictMap] = useState({});
  // Demo 引導：有 YOLO 影像的示範 Glass ID（後端沒這支 API 就不顯示提示列）
  const [demoGlasses, setDemoGlasses] = useState([]);
  const [presetGids, setPresetGids] = useState([]);
  // const [commentDfArr, setCommentDfArr] = useState([]);
  // let [tableData, setTableData] = useState(initTableData);

  const handleEmployee = (e) => {
    props.setEmployee(e.target.value);
  };
  const handleDate = (date) => {
    // 轉換為 YYYY-MM-DD 格式
    const formattedDate = date ? date.toISOString().split("T")[0] : "";
    props.setPickdate(formattedDate);
  };
  const handleLine = (e) => {
    props.setLine(e.target.value);
  };
  const handleProduct = (e) => {
    props.setProduct(e.target.value);
  };
  const handleAddItem = () => {
    setStandardRowNum((standardRowNum += 1));
    // console.log(standardRowNum);
  };
  const handleSubmitBtnEvent = async () => {
    if (props.line === "" || props.product === "") {
      window.alert("產線 & 品名為必填，欄位不可為空!");
      return;
    }

    const rows = (glassRows || []).filter((r) => String(r.gid || "").trim().length > 0);
    if (rows.length === 0) {
      window.alert("至少要有一列填了 Glass ID");
      return;
    }

    // outline：前三大 defect（by ratio）、送出時間、拖拉圖片槽位
    const place = ["first", "second", "third"];
    const infomData = {};
    place.forEach((key, i) => {
      if (sortedDfArr[i] != null) {
        infomData[key] = `${sortedDfArr[i]}-${((sortedRatios[i] || 0) * 100).toFixed(0)}%`;
      }
    });

    const finalComment = postContent;
    const nowTime = new Date().toLocaleString("sv").split(" ")[1];
    Object.assign(infomData, {
      datetime: props.pickdate ? new Date(`${props.pickdate} ${nowTime}`) : new Date(),
      emp: props.employee,
      line: props.line,
      product: props.product,
      comment: finalComment,
      lot: String(rows[0].gid).slice(0, 8),
      drag_slots: dragSlots,
    });

    let outlineId;
    let err = "";
    try {
      const res = await FmaService.addOutline(infomData);
      outlineId = res.data.savedFmaOutline.id;
    } catch (e) {
      err += e.response?.data?.msg || "Outline 儲存失敗";
      setMessage(err);
      messageRef.current = err;
      return;
    }

    // glass 列：12 個標準欄位 + otherdf（自訂欄）
    const glassDataSet = rows.map((r) => {
      const otherdf = [];
      Object.values(r.otherdf || {}).forEach((obj) => {
        const name = Object.keys(obj)[0];
        const count = Number(Object.values(obj)[0]) || 0;
        if (name && count > 0) otherdf.push({ [name]: count });
      });
      const out = { gid: r.gid, date: props.pickdate, outlineId, otherdf };
      oriDbDefect.forEach((k) => { out[k] = Number(r[k]) || 0; });
      out.s = Number(r.s) || 0;
      out.m = Number(r.m) || 0;
      out.l = Number(r.l) || 0;
      return out;
    });

    try {
      await FmaService.addGlasses(props.employee, glassDataSet);
      if (messageRef.current === "") {
        window.alert("FMA資料儲存成功，將重新導向回查詢頁面!!");
        navigate("/fmaquery");
      }
    } catch (e) {
      err += e.response?.data?.msg || "Glass 資料儲存失敗";
      setMessage(err);
      messageRef.current = err;
    }
  };
  const handleAddCol = () => {
    props.setOthersColSpan(props.othersColSpan + 1);
    // console.log(othersColSpan);
  };

  // 取示範 Glass ID：只留同一條產線的，帶入後按 Refresh 才查得到影像
  useEffect(() => {
    ImageService.demoGlasses(12)
      .then((res) => {
        const all = res.data?.glasses || [];
        if (all.length === 0) return;
        const ln = all[0].line;
        setDemoGlasses(all.filter((g) => g.line === ln).slice(0, 5));
      })
      .catch(() => setDemoGlasses([])); // 沒有這支 API 就靜靜不顯示
  }, []);

  const applyDemoGlasses = () => {
    if (demoGlasses.length === 0) return;
    props.setLine(demoGlasses[0].line);
    setPresetGids(demoGlasses.map((g) => g.gid));
  };

  useEffect(() => {
    if (message !== "") {
      setTimeout(() => {
        setMessage("");
      }, 5000);
    }
  }, [message]);

  return (
    <div className="fma-data-query" style={{ padding: "2.5rem" }}>
      <div className="card text-center" style={{ marginBottom: "1.5rem" }}>
        <h3 className="card-header">{props.cardHeader}</h3>
        <div className="card-body mt-3 me-4">
          <div className="d-flex justify-content-center mb-2">
            <div id="employee" className="d-flex me-3 w-50">
              <label htmlFor="employee" className="col-sm-2 col-form-label ">
                工號:
              </label>
              <input
                defaultValue={props.employee}
                onChange={handleEmployee}
                type="text"
                className="form-control"
                name="employee"
                placeholder="請輸入FMA人員工號"
              />
            </div>
            <div id="date" className="d-flex w-50">
              <label
                htmlFor="date-pick"
                className="col-sm-2 col-form-label flex-grow-1"
              >
                日期:
              </label>
              <DatePicker
                selected={
                  props.pickdate ? new Date(props.pickdate) : new Date()
                }
                onChange={handleDate}
                className="form-control flex-shrink-1"
                dateFormat="yyyy-MM-dd"
                id="date-pick"
                name="datePicker"
                minDate={new Date("2018-01-01")}
                maxDate={new Date()}
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                wrapperClassName="full-width-datepicker"
              />
            </div>
          </div>
          <div className="d-flex justify-content-center">
            <div id="line" className="d-flex me-3 w-50">
              <label htmlFor="line" className="col-sm-2 col-form-label ">
                產線:
              </label>
              {/* 受控：一鍵帶入示範資料時要能連動選到對應產線 */}
              <select
                onChange={handleLine}
                value={props.line || "DEFAULT"}
                className="form-select"
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
              <label htmlFor="product" className="col-sm-2 col-form-label ">
                品名:
              </label>
              <input
                value={props.product}
                onChange={handleProduct}
                type="text"
                className="form-control"
                name="product"
                placeholder="下方輸入GlassID後，按refresh自動更新"
              />
            </div>
          </div>
        </div>
        {/* {message && <div className="alert alert-danger w-75">{message}</div>} */}
        <div className="card-body text-center">
          {message && <div className="alert alert-danger">{message}</div>}
          {demoGlasses.length > 0 && (
            <div
              className="alert alert-info d-flex align-items-center justify-content-center flex-wrap gap-2 py-2 px-3 mb-2"
              style={{ fontSize: "0.85rem" }}
            >
              <span className="fw-bold">示範資料</span>
              <span className="text-muted">
                帶入有 YOLO 影像的 Glass ID，再按下方「Refresh」載入預測結果與圖片
              </span>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary py-0"
                onClick={applyDemoGlasses}
              >
                帶入 {demoGlasses.length} 筆（{demoGlasses[0].line}）
              </button>
            </div>
          )}
          <FmaTableElement
            presetGids={presetGids}
            product={props.product}
            editable={isReadyOnly}
            standardRowNum={standardRowNum}
            setStandardRowNum={setStandardRowNum}
            othersColSpan={props.othersColSpan}
            setGlassDataSet={setGlassRows}
            customColNames={customColNames}
            setCustomColNames={setCustomColNames}
            setDfAvgForBar={setDfAvgForBar}
            setDfRatioForLine={setDfRatioForLine}
            setSmlAvg={setSmlAvg}
            smlMap={smlMap}
            predictMap={predictMap}
          />
          <FmaTextareaElement
            postContent={postContent}
            setPostContent={setPostContent}
            line={props.line}
            product={props.product}
            sortedDfArr={sortedDfArr}
            sortedRatios={sortedRatios}
            editable={isReadyOnly}
            smlAvg={smlAvg}
            standardRowNum={standardRowNum}
            actionArr={actionArr}
            setActionArr={setActionArr}
          />
        </div>
        <div className="card-footer">
          <div className="d-flex justify-content-center m-1">
            <button
              type="button"
              className="btn btn-secondary me-3 p-2"
              onClick={handleAddItem}
            >
              <span>新增項次</span>
            </button>
            <button className="btn btn-success me-3 p-2" onClick={handleAddCol}>
              <span>新增欄位</span>
            </button>
            {/* <button
              className="btn btn-warning me-3 p-2"
              onClick={handleImportImgs}
            >
              <span>載入圖片</span>
            </button> */}
            <button
              className="btn btn-primary p-2"
              onClick={handleSubmitBtnEvent}
            >
              <span>送出表單</span>
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-header text-center">FMA Result</h3>
        <div className="card-body pb-4">
          <FmaEchartElement
            dfAvgForBar={dfAvgForBar}
            setDfAvgForBar={setDfAvgForBar}
            dfRatioForLine={dfRatioForLine}
            setDfRatioForLine={setDfRatioForLine}
            defectArr={props.defectArr}
            line={props.line}
            product={props.product}
            setSortedDfArr={setSortedDfArr}
            setSortedRatios={setSortedRatios}
          />
        </div>
        <div className="card-body pt-2 pb-2">
          <DragDropImageTable
            sortedDfArr={sortedDfArr}
            images={poolImages}
            onSlotsChange={setDragSlots}
          />
        </div>
        <div className="card-body pt-2 pb-4">
          <DefectTableElement
            defectArr={props.defectArr}
            product={props.product}
            setProduct={props.setProduct}
            line={props.line}
            glassRows={glassRows}
            onSmlDataFetched={(map) => setSmlMap(map)}
            onImagesLoaded={setPoolImages}
            onPredictDataFetched={setPredictMap}
          />
        </div>
      </div>
    </div>
  );
};

export default QueryFormComponent;
