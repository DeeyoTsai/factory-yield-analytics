import { useState, useRef, useEffect } from "react";
// import "../css/query-form-element.css";S
import FmaTableElement from "./fma-table-element";
import FmaEchartElement from "./fma-echart-element";
import DefectTableElement from "./defect-table-element";
import DragDropImageTable from "./drag-drop-image-table";
import { useNavigate } from "react-router-dom";
import FmaService from "../../services/fma.service";
// import fmaService from "../../services/fma.service";
// import ImageService from "../../services/image.service";
import FmaTextareaElement from "./fma-textarea-element";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../css/DatePickerStyles.css";

const QueryFormComponent = (props) => {
  const navigate = useNavigate();
  const oriDbDefect = [
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
    "rresistsmall",
    "gresistsmall",
    "bresistsmall",
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
  ];

  let [standardRowNum, setStandardRowNum] = useState(5);
  let [smlAvg, setSmlAvg] = useState(0.0);
  // let [othersColSpan, setOthersColSpan] = useState(5);
  // For barChart --> all Total Num data
  let [dfAvgForBar, setDfAvgForBar] = useState([]);
  // For lineChart --> all Avg Num data
  let [dfRatioForLine, setDfRatioForLine] = useState([]);
  let [sortedDfArr, setSortedDfArr] = useState([]);
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
    let fmaTable = document.querySelectorAll(".df-row");
    let sheetCol = ["s", "m", "l"];
    let glassDataSet = [];
    let outlineId;
    let outlineSaveErr = "";
    if (props.line === "" || props.product === "") {
      window.alert("產線 & 品名為必填，欄位不可為空!");
    } else {
      // 送出fma Outline，包含前三大defect、送出時間 ==> outline data
      const place = ["first", "second", "third"];
      let infomData = {};
      if (sortedDfArr.length < 3) {
        sortedDfArr.forEach((e, i) => {
          let contain = e + "-" + (dfRatioForLine[i] * 100).toFixed(1) + "%";
          const key = place[i];
          Object.assign(infomData, { [key]: contain });
        });
      } else {
        place.forEach((e, i) => {
          let contain =
            sortedDfArr[i] + "-" + (dfRatioForLine[i] * 100).toFixed(0) + "%";
          // const key = e;
          Object.assign(infomData, { [e]: contain });
        });
      }
      // console.log(fmaTable);
      let lot = fmaTable[0].childNodes[1].innerText.slice(0, 7);
      let finalComment = document.querySelector("#floatingTextarea2").innerHTML;
      // console.log(finalComment);
      const nowTime = new Date().toLocaleString("sv").split(" ")[1];
      Object.assign(
        infomData,
        {
          datetime: props.pickdate
            ? new Date(`${props.pickdate} ${nowTime}`)
            : new Date(),
        },
        { emp: props.employee },
        { line: props.line },
        { product: props.product },
        { comment: finalComment },
        { lot },
        { drag_slots: dragSlots },
      );
      try {
        // console.log(infomData);
        const outlineData = await FmaService.addOutline(infomData);
        outlineId = outlineData.data.savedFmaOutline.id;
      } catch (e) {
        console.log(e);
        outlineSaveErr += e.response.data.msg;
        setMessage(outlineSaveErr);
        messageRef.current = outlineSaveErr;
      }
      // 送出fma table寫資料
      fmaTable.forEach((dfRow) => {
        let rowArr = [];
        let otherDefectArr = [];
        dfRow.childNodes.forEach((e) => {
          rowArr.push(e.innerText);
        });
        let g_id = rowArr[1];
        // glass id不為空字串才發送資料
        if (g_id.length > 0) {
          const rowDfCount = rowArr
            .splice(2, props.defectArr.length)
            .map(Number);

          const rowSml = rowArr.splice(-5, 3).map(Number);
          let rowDfCountObj = {};
          rowDfCountObj.otherdf = otherDefectArr;
          let rowSmlObj = {};
          props.defectArr.forEach((e, i) => {
            e = e.split("-").join("");
            // 表格內的defect，以物件方式儲存
            if (oriDbDefect.includes(e)) {
              rowDfCountObj[e] = rowDfCount[i];
              //新增的defect，以array包object方式儲存
            } else {
              const newDfObj = { [e]: rowDfCount[i] };
              // rowDfCount.otherDf[e] = rowDfCount[i];
              otherDefectArr.push(newDfObj);
            }
          });

          // 新增defect array轉string for data儲存
          // rowDfCountObj.otherDf = JSON.stringify(otherDefectArr);

          sheetCol.forEach((e, i) => {
            rowSmlObj[e] = rowSml[i];
          });
          // 移除沒有數值的defect column
          const rmZero = (item) =>
            Object.keys(item)
              .filter((key) => item[key] !== 0)
              .reduce((newObj, key) => {
                newObj[key] = item[key];
                return newObj;
              }, {});
          // Concate objects
          const rowData = Object.assign(
            {},
            rmZero(rowDfCountObj),
            rmZero(rowSmlObj),
            // { fmaEmployee: props.employee },
            // { line: props.line },
            { date: props.pickdate },
            // { product: props.product },
            { gid: g_id },
            { outlineId },
          );
          glassDataSet.push(rowData);
        }
      });
      try {
        // console.log(glassDataSet);
        await FmaService.addGlasses(props.employee, glassDataSet);
        if (messageRef.current === "") {
          window.alert("FMA資料儲存成功，將重新導向回查詢頁面!!");
          navigate("/fmaquery");
        }
      } catch (e) {
        console.log(e);
        // setMessage((prev) => prev + e.response.data.msg);
        outlineSaveErr += e.response.data.msg;
        setMessage(outlineSaveErr);
        messageRef.current = outlineSaveErr;
      }
    }
  };
  const handleAddCol = () => {
    props.setOthersColSpan(props.othersColSpan + 1);
    // console.log(othersColSpan);
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
              <select
                onChange={handleLine}
                // value={props.line}
                className="form-select"
                defaultValue={"DEFAULT"}
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
          <FmaTableElement
            currentUser={props.currentUser}
            currentDate={props.currentDate}
            employee={props.employee}
            setEmployee={props.setEmployee}
            pickdate={props.pickdate}
            setPickdate={props.setPickdate}
            line={props.line}
            setLine={props.setLine}
            product={props.product}
            setProduct={props.setProduct}
            standardRowNum={standardRowNum}
            setStandardRowNum={setStandardRowNum}
            othersColSpan={props.othersColSpan}
            setOthersColSpan={props.setOthersColSpan}
            dfAvgForBar={dfAvgForBar}
            setDfAvgForBar={setDfAvgForBar}
            dfRatioForLine={dfRatioForLine}
            setDfRatioForLine={setDfRatioForLine}
            defectArr={props.defectArr}
            setDefectArr={props.setDefectArr}
            // defectArrRef={props.defectArrRef}
            editable={isReadyOnly}
            setSmlAvg={setSmlAvg}
            smlMap={smlMap}
            predictMap={predictMap}
            // tableData={tableData}
            // setTableData={setTableData}
          />
          <FmaTextareaElement
            postContent={postContent}
            setPostContent={setPostContent}
            line={props.line}
            product={props.product}
            sortedDfArr={sortedDfArr}
            dfRatioForLine={dfRatioForLine}
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
            // sortedDfArr={sortedDfArr}
            setSortedDfArr={setSortedDfArr}
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
            onSmlDataFetched={(map) => setSmlMap(map)}
            onImagesLoaded={setPoolImages}
            onPredictDataFetched={setPredictMap}
            // sortedDfArr={sortedDfArr}
            // defectArrRef={props.defectArrRef}
          />
        </div>
      </div>
    </div>
  );
};

export default QueryFormComponent;
