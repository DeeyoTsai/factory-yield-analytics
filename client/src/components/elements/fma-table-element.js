import React, { useState, useEffect, useRef } from "react";
import { FaTrashAlt } from "react-icons/fa";
import "../css/fma-table-element.css";
// import { collapseClasses } from "@mui/material";
import "react-calendar/dist/Calendar.css";
import { useFma } from "../../contexts/FmaContext";


const FmaTableElement = ({
  product,
  editable,
  // defectArr,
  // setDefectArr,
  standardRowNum,
  setStandardRowNum,
  glassDataSet,
  setGlassDataSet,
  othersColSpan,
  setOthersColSpan,
  setDfRatioForLine,
  setDfAvgForBar,
  setSmlAvg,
  smlMap,
  predictMap,
}) => {

  const {
    defectArr,
    setDefectArr,
    // tableData,
    // setTableData,
  } = useFma();


  let initObj = {
    id: "",
    date: "",
    gid: "",
  };

  defectArr.slice(0, 24).map((e, i) => (initObj[e?.replaceAll("-", "")] = ""));
  initObj["s"] = "";
  initObj["m"] = "";
  initObj["l"] = "";
  initObj["createdAt"] = "";
  initObj["updatedAt"] = "";
  initObj["outlineId"] = "";
  initObj["otherdf"] = {};

  const initTableData = () => {
    let initArr = [];
    for (let i = 0; i < standardRowNum; i++) {
      // console.log(Object.keys(initObj).length);
      // let cpObj = { ...initObj };
      let cpObj = JSON.parse(JSON.stringify(initObj));
      cpObj.id = i;
      initArr.push(cpObj);
    }

    return initArr;
  };

  // let RowArr = [];
  let sheetTotal = [];
  const [actionArr, setActionArr] = useState([]);
  const [totalNum, setTotalNum] = useState([]);
  const [avgNum, setAvgNum] = useState([]);
  const [ratioNum, setRatioNum] = useState([]);
  const [accRatioNum, setAccRatioNum] = useState([]);
  let [tableData, setTableData] = useState(initTableData);
  // setTableData(initTableData);
  let tableDataRef = useRef(tableData);
  // const tableKeys = Object.keys(tableDataRef.current[0]);
  // const removeDash = defectArr.map((x) => x?.replaceAll("-", ""));
  // 取出tableData keys，除了defect type以外的欄位
  // const different = tableKeys.filter((x) => !removeDash.includes(x));
  let savedPosRef = useRef(null);
  const isComposing = useRef(false);
  // let queryPage = false;

  let defectArrRef = useRef([]);

  const handleCompositionStart = () => {
    isComposing.current = true;
  };

  const handleCompositionEnd = (e, i, dfType, col_n = 0) => {
    isComposing.current = false;
    if (!isComposing.current) {
      // 保持key in數值時游標位置
      const selection = window.getSelection();
      // console.log(selection);
      if (selection.rangeCount > 0) {
        if (isNaN(selection.getRangeAt(0).commonAncestorContainer.data)) {
          savedPosRef.current = 0;
        } else {
          savedPosRef.current = Number(
            selection.getRangeAt(0).commonAncestorContainer.data
          ).toString().length;
        }
      }
      if (dfType !== "otherdf") {
        setTableData((prevData) => {
          tableDataRef.current = prevData.map(
            (item, index) =>
              index === i
                ? { ...item, [dfType]: Number(e.target.innerText) }
                : item
            // index === i ? { ...item, [dfType]: Number(e.nativeEvent.data) } : item
          );
          // console.log(tableDataRef.current);
          return tableDataRef.current;
        });
      } else {
        // 自定義defect type輸入數值後寫入tableData
        const col_head = `selfDefine_${col_n}`;
        setTableData((prevData) => {
          tableDataRef.current = prevData.map((item, index) => {
            if (index === i) {
              // let cpObj = { ...item };
              // 嵌套物件使用深拷貝
              let cpObj = JSON.parse(JSON.stringify(item));
              const realDfName = Object.keys(cpObj.otherdf[col_head])[0];
              cpObj.otherdf[col_head][realDfName] = Number(e.target.innerText);
              // cpObj.otherdf[col_head][realDfName] = Number(e.nativeEvent.data);
              return cpObj;
            } else {
              return item;
            }
          });
          return tableDataRef.current;
        });
      }
    }
  };

  const handleRowDelete = (e) => {
    // console.log(standardRowNum);

    setStandardRowNum((prev_rowNum) => {
      if (prev_rowNum > 0) {
        prev_rowNum = prev_rowNum - 1;
        // console.log(prev_rowNum);
        return prev_rowNum;
      }
      // console.log(prev);
    });
    // console.log(standardRowNum);
    const del_row_id = Number(
      e.currentTarget.parentElement.parentElement.id.split("-")[2]
    );
    // console.log(del_row_id);

    setTableData((prev) => {
      // 濾除掉已刪除的欄位
      prev = prev.filter((e) => e.id !== del_row_id);
      // console.log(prev);

      // 重設tableData id編號
      tableDataRef.current = prev.map((item, index) => {
        let cpItem = { ...item };
        cpItem.id = index;
        return cpItem;
      });
      return tableDataRef.current;
    });
  };

  function sumArr(arr) {
    return arr.reduce((acc, cur) => acc + cur, 0.0);
  }

  // Create a python range like function
  // function Range(size, startNum = 0) {
  //   return [...Array(size).keys()].filter((i) => i >= startNum);
  // }
  // 取得產品欄位(glass id)不為空白的列數
  function getNotEmptyRowLen() {
    let countNotEmptyRows = 0;
    let notEmptyGidRows = document.querySelectorAll(".gid");
    notEmptyGidRows.forEach((row) => {
      let gid_row_value = row.innerHTML.replace(/[<]br[^>]*[>]/gi, "");
      if (gid_row_value !== "") {
        countNotEmptyRows += 1;
      }
    });
    return countNotEmptyRows;
  }

  // 算sml加總
  const calSmlTotal = (item) => {
    const listItems = [];
    const smlArr = ["s", "m", "l"];
    
    tableData.forEach((e, i) => {
      if (item === i) {
        let rowCount = 0;
        smlArr.forEach((s, i) => {
          rowCount += Number(e?.[s]);
        });
        sheetTotal.push(rowCount);
        // console.log(sheetTotal);

        // setDfAvgForBar(rowCount);
        listItems.push(
          <td key={`df-sum-${i}`} className="df-sum">
            {rowCount}
          </td>
        );
      }
    });
    return listItems;
  };

  const changeCellValue = (e, i, dfType, col_n = 0) => {
    if (!isComposing.current) {
      // 保持key in數值時游標位置
      const selection = window.getSelection();
      // console.log(selection);
      if (selection.rangeCount > 0) {
        if (isNaN(selection.getRangeAt(0).commonAncestorContainer.data)) {
          savedPosRef.current = 0;
        } else {
          savedPosRef.current = Number(
            selection.getRangeAt(0).commonAncestorContainer.data
          ).toString().length;
        }
      }
      if (dfType !== "otherdf") {
        setTableData((prevData) => {
          tableDataRef.current = prevData.map(
            (item, index) =>
              index === i
                ? { ...item, [dfType]: Number(e.target.innerText) }
                : item
            // index === i ? { ...item, [dfType]: Number(e.nativeEvent.data) } : item
          );
          return tableDataRef.current;
        });
      } else {
        // 自定義defect type輸入數值後寫入tableData
        const col_head = `selfDefine_${col_n}`;
        setTableData((prevData) => {
          tableDataRef.current = prevData.map((item, index) => {
            if (index === i) {
              // let cpObj = { ...item };
              // 嵌套物件使用深拷貝
              let cpObj = JSON.parse(JSON.stringify(item));
              const realDfName = Object.keys(cpObj.otherdf[col_head])[0];
              cpObj.otherdf[col_head][realDfName] = Number(e.target.innerText);
              // cpObj.otherdf[col_head][realDfName] = Number(e.nativeEvent.data);
              return cpObj;
            } else {
              return item;
            }
          });

          return tableDataRef.current;
        });
      }
    }
  };

  // Handle focus/selection restoration
  useEffect(() => {
    if (savedPosRef.current !== null) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        // console.log(range);
        if (range.endOffset == 0) {
          // console.log(range.endOffset);
          try {
            range.setStart(range.startContainer, savedPosRef.current);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
            savedPosRef.current = null;
          } catch (e) {
            console.log(e);
          }
        }
      }
    }
  }, [savedPosRef.current]);

  useEffect(() => {
    if (glassDataSet && tableData.length === 0) {
      const addCol = glassDataSet[0].otherdf;
      if (addCol.length > 0 && othersColSpan === 5) {
        setOthersColSpan(othersColSpan + addCol.length);
      }
      setStandardRowNum(glassDataSet.length);
      // console.log(glassDataSet);
      
      // 僅初始化將glassDataSet帶入TableData
      tableDataRef.current = glassDataSet.map((e, i) => {
        let addColArr = {};
        for (let col_n = 0; col_n < addCol.length; col_n++) {
          const define_name = `selfDefine_${col_n + 1}`;
          const define_obj = { [define_name]: e.otherdf[col_n] };
          addColArr = { ...addColArr, ...define_obj };
        }
        e.otherdf = addColArr;
        return e;
      });
      
      setTableData(tableDataRef.current);

      // 重設tableData id編號
      setTableData((prev) => {
        // 重設tableData id編號
        tableDataRef.current = prev.map((item, index) => {
          // let cpItem = JSON.parse(JSON.stringify(item));
          let cpItem = structuredClone(item);
          cpItem.sqlId = cpItem.id;
          cpItem.id = index;
          return cpItem;
        });
        // console.log(tableDataRef.current);

        return tableDataRef.current;
      });
    }
    // tableData內資料變更時，回寫glassDataSet，for query網頁資料更新
    if (glassDataSet) {
      setGlassDataSet(tableDataRef.current);
    }

    // 處理新增項次
    if (tableDataRef.current?.length < standardRowNum) {
      let cpObj;
      if (othersColSpan > 5) {
        let addColNum = othersColSpan - 5;
        let addColArr = {};
        let define_obj;
        for (let col_n = 0; col_n < addColNum; col_n++) {
          const define_name = `selfDefine_${col_n + 1}`;
          let real_df_obj = {};
          real_df_obj[defectArr[24 + col_n]] = "";
          define_obj = { [define_name]: real_df_obj };
          addColArr = { ...addColArr, ...define_obj };
        }
        cpObj = { ...initObj, otherdf: addColArr };
      } else {
        cpObj = { ...initObj };
      }

      cpObj.id = tableDataRef.current.length;
      tableDataRef.current.push(cpObj);
      setTableData(tableDataRef.current);
    }

    // 計算Total Num, Avg Num, rario, acc-ratio
    let totalNumArr = [];
    let avgNumArr = [];
    let ratioNumArr = [];
    let accRatioNumArr = [];
    let defectTypeArr = [];
    // 新增defect欄位存入defectTypeArr array
    if (othersColSpan > 5 && tableDataRef.current.length > 0) {
      const selfDefObjs = Object.values(tableDataRef.current[0].otherdf);
      // console.log(selfDefObjs);
      const uniSelfDef = new Set();
      selfDefObjs.forEach((element) => {
        uniSelfDef.add(Object.keys(element)[0]?.replace(/\n/g, ""));
      });
      // console.log(uniSelfDef);
      defectTypeArr = [...defectArr.slice(0, 24), ...uniSelfDef];
      // console.log(defectTypeArr);
      setDefectArr(defectTypeArr);
    }

    for (let j = 0; j < defectArr.length; j++) {
      let dfSum = 0;
      let dfAvg = 0.0;
      let dfType = defectArr[j];

      for (let i = 0; i < tableDataRef.current?.length; i++) {
        if (j < 24) {
          // console.log(defectArr.length);
          dfType = dfType.replaceAll("-", "");
          dfSum += Number(tableDataRef.current[i][dfType]);
        } else {
          // 計算新增欄位的total Num、Avg Num
          if (Object.keys(tableDataRef.current[i].otherdf).length > 0) {
            dfSum += Number(
              tableDataRef.current[i].otherdf[`selfDefine_${j - 23}`][
                defectArr[j]
              ]
            );
          }
        }
        if (getNotEmptyRowLen() > 0) {
          dfAvg = isNaN(dfSum / getNotEmptyRowLen())
            ? 0.0
            : dfSum / getNotEmptyRowLen();
        }
      }
      totalNumArr.push(dfSum);
      avgNumArr.push(dfAvg);
    }

    // set total num row data and avg num row data
    setSmlAvg((sumArr(sheetTotal) / getNotEmptyRowLen())?.toFixed(1));
    setTotalNum(totalNumArr);
    setAvgNum(avgNumArr);
    setDfAvgForBar([...avgNumArr]);
    // 設定百分比row data
    let dfRatio;
    for (let j = 0; j < defectArr.length; j++) {
      dfRatio = totalNumArr[j] / sumArr(totalNumArr);
      ratioNumArr.push(dfRatio);
    }
    setRatioNum(ratioNumArr);
    setDfRatioForLine([...ratioNumArr]);
    let accRatio = 0.0;
    ratioNumArr.reduce((acc, cur) => {
      accRatio += cur;
      accRatioNumArr.push(accRatio);
    }, 0.0);
    setAccRatioNum(accRatioNumArr);
    // console.log(tableData);
    // console.log(glassDataSet);
    
    
  }, [glassDataSet, tableData, standardRowNum, othersColSpan]);

  // 新增欄位
  useEffect(() => {
    // console.log(totalNum);
    if (!glassDataSet) {
      for (let i = 0; i < tableDataRef.current?.length; i++) {
        if (othersColSpan > 5) {
          const defaultColName = "selfDefine_" + (othersColSpan - 5);
          tableDataRef.current[i]["otherdf"][defaultColName] = {};
        }
      }
      setTableData(tableDataRef.current);
      // setTotalNum([...totalNum, 0]);
    }
  }, [othersColSpan]);

  useEffect(() => {
    defectArrRef.current = defectArr;
  }, [defectArr]);

  useEffect(() => {
    if (!smlMap || Object.keys(smlMap).length === 0) return;
    setTableData((prev) => {
      tableDataRef.current = prev.map((item) => {
        const sml = smlMap[item.gid];
        if (sml) {
          return { ...item, s: sml.s ?? item.s, m: sml.m ?? item.m, l: sml.l ?? item.l };
        }
        return item;
      });
      return tableDataRef.current;
    });
  }, [smlMap]);

  const DEFECT_FIELDS = [
    "runder","gunder","bunder","bmwp","rwp","gwp","bwp",
    "rgel","ggel","bgel","rresistsmall","gresistsmall","bresistsmall",
    "rfiber","gfiber","bfiber","bp","bmdirty","repair",
    "abovep","backdirty","dirty","ovendrop","black",
  ];

  useEffect(() => {
    if (!predictMap || Object.keys(predictMap).length === 0) return;
    setTableData((prev) => {
      tableDataRef.current = prev.map((item) => {
        if (!item.gid) return item;
        const predicted = predictMap[item.gid];
        if (!predicted) return item;
        // 若該 row 已有 user 填入的 defect 資料，跳過不覆蓋
        const hasUserData = DEFECT_FIELDS.some((f) => {
          const v = item[f];
          return v !== "" && Number(v) > 0;
        });
        if (hasUserData) return item;
        return { ...item, ...predicted };
      });
      return tableDataRef.current;
    });
  }, [predictMap]);

  // useEffect(()=>{
  //   if (tableData.length == 0) {
  //     setTableData(initTableData);
  //   }
  // },[])

  return (
    <div className="fma-result-input">
      <table
        className="fma-table"
        style={{ tableLayout: "auto", width: "100%" }}
      >
        <thead>
          <tr>
            <th rowSpan="3" style={{ width: "2vw" }}>
              項次
            </th>
            <th rowSpan="2" style={{ width: "2vw" }}>
              產品/Glass
            </th>
            <th colSpan={(24 + othersColSpan - 5).toString()}>Defect Type</th>
            <th rowSpan="2">FMA Total</th>
            <th colSpan="4" rowSpan="2" className="df-cal">
              Sheet Data
            </th>
          </tr>
          <tr>
            <th colSpan="3">異物</th>
            <th colSpan="4">WP</th>
            <th colSpan="3">殘膠</th>
            <th colSpan="3">微小異物</th>
            <th colSpan="3">纖維</th>
            <th colSpan="3">前程</th>
            <th colSpan={othersColSpan.toString()}>其他</th>
          </tr>
          <tr>
            <th
              //   contentEditable="true"
              style={{ width: "10vw" }}
              className="edit-color"
            >
              {product}
            </th>
            <th style={{ width: "2.5vw" }}>R</th>
            <th style={{ width: "2.5vw" }}>G</th>
            <th style={{ width: "2.5vw" }}>B</th>
            <th style={{ width: "2.5vw" }}>BM</th>
            <th style={{ width: "2.5vw" }}>R</th>
            <th style={{ width: "2.5vw" }}>G</th>
            <th style={{ width: "2.5vw" }}>B</th>
            <th style={{ width: "2.5vw" }}>R</th>
            <th style={{ width: "2.5vw" }}>G</th>
            <th style={{ width: "2.5vw" }}>B</th>
            <th style={{ width: "2.5vw" }}>R</th>
            <th style={{ width: "2.5vw" }}>G</th>
            <th style={{ width: "2.5vw" }}>B</th>
            <th style={{ width: "2.5vw" }}>R</th>
            <th style={{ width: "2.5vw" }}>G</th>
            <th style={{ width: "2.5vw" }}>B</th>
            <th style={{ width: "2.5vw" }}>BP</th>
            <th style={{ width: "4vw" }}>BM髒汙</th>
            <th style={{ width: "4vw" }}>修正痕</th>
            <th style={{ width: "2.5vw" }}>膜上</th>
            <th style={{ width: "2.5vw" }}>背汙</th>
            <th style={{ width: "2.5vw" }}>髒汙</th>
            <th style={{ width: "2.5vw" }}>氣泡</th>
            <th style={{ width: "3.5vw" }}>黑色系</th>
            {(() => {
              const itemList = [];
              const addColNum = othersColSpan - 5;
              for (let i = 1; i <= addColNum; i++) {
                itemList.push(
                  <th
                    key={`add-col-td-${i}`}
                    style={{ width: "2.5vw" }}
                    className={`selfDefine_${i}`}
                    contentEditable={!editable}
                    suppressContentEditableWarning
                    // 新增欄位new defect type寫入tableData.otherdf以物件方式儲存
                    // 儲存格式: { selfDefine_i: { newDefect: '' } }
                    // values={
                    //   defectArr.length > 24 ? defectArr[24 + i] : ""
                    // }
                    // defaultValue={defectArr[24 + i - 1]}
                    onBlur={(e) => {
                      const newDfType = e.target.innerText;
                      if (newDfType.length > 0) {
                        const preDefine = `selfDefine_${i}`;
                        setTableData((prevData) => {
                          tableDataRef.current = prevData.map((item) => {
                            let define_obj = item.otherdf;
                            define_obj[preDefine] = {};
                            define_obj[preDefine][newDfType] = "";
                            return { ...item, otherdf: define_obj };
                          });
                          return tableDataRef.current;
                        });
                      }
                    }}
                  >
                    {defectArr.length > 24 && defectArr[24 + i - 1]}
                  </th>
                );
              }
              return itemList;
            })()}
            <th style={{ width: "3.5vw" }}>單枚總和</th>
            <th className="df-cal" style={{ width: "3vw" }}>
              S
            </th>
            <th className="df-cal" style={{ width: "3vw" }}>
              M
            </th>
            <th className="df-cal" style={{ width: "3vw" }}>
              L
            </th>
            <th className="df-cal">Total</th>
          </tr>
        </thead>
        <tbody id="fma-tbody">
          {/* IIF Create default columns */}
          {(() => {
            // const standardRowNum = 5;
            const listItems = [];
            for (let i = 0; i < tableData?.length; i++) {
              let row_id = "df-row-";
              row_id = row_id + `${i}`;
              listItems.push(
                <tr className="df-row" key={i} id={row_id}>
                  <td className="item">{i + 1}</td>
                  <td
                    className="gid edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    // onBlur={(e) => {
                    // onInput={(e) => {
                    onInput={(e) => {
                      // Save cursor position
                      const selection = window.getSelection();
                      if (selection.rangeCount > 0) {
                        savedPosRef.current =
                          selection.getRangeAt(0).startOffset;
                      }
                      setTableData((prevData) => {
                        tableDataRef.current = prevData.map((item, id) =>
                          id === i ? { ...item, gid: e.target.innerText } : item
                        );
                        return tableDataRef.current;
                      });
                    }}
                  >
                    {tableData.length > 0 && tableData[i].gid}
                  </td>
                  <td
                    // ref={savedPosRef}
                    // values={(e) => tableDataRef.current[i]["runder"]}
                    className="r-under edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={(e) =>
                      handleCompositionEnd(e, i, "runder")
                    }
                    onInput={(e) => changeCellValue(e, i, "runder")}
                  >
                    {tableData.length > 0 && tableData[i].runder}
                  </td>
                  <td
                    className="g-under edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={(e) =>
                      handleCompositionEnd(e, i, "gunder")
                    }
                    onInput={(e) => changeCellValue(e, i, "gunder")}
                  >
                    {tableData.length > 0 && tableData[i].gunder}
                  </td>
                  <td
                    className="b-under edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={(e) =>
                      handleCompositionEnd(e, i, "bunder")
                    }
                    onInput={(e) => changeCellValue(e, i, "bunder")}
                  >
                    {tableData.length > 0 && tableData[i].bunder}
                  </td>
                  <td
                    className="bm-wp edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={(e) => handleCompositionEnd(e, i, "bmwp")}
                    onInput={(e) => changeCellValue(e, i, "bmwp")}
                  >
                    {tableData.length > 0 && tableData[i].bmwp}
                  </td>
                  <td
                    className="r-wp edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={(e) => handleCompositionEnd(e, i, "rwp")}
                    onInput={(e) => changeCellValue(e, i, "rwp")}
                  >
                    {tableData.length > 0 && tableData[i].rwp}
                  </td>
                  <td
                    className="g-wp edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={(e) => handleCompositionEnd(e, i, "gwp")}
                    onInput={(e) => changeCellValue(e, i, "gwp")}
                  >
                    {tableData.length > 0 && tableData[i].gwp}
                  </td>
                  <td
                    className="b-wp edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={(e) => handleCompositionEnd(e, i, "bwp")}
                    onInput={(e) => changeCellValue(e, i, "bwp")}
                  >
                    {tableData.length > 0 && tableData[i].bwp}
                  </td>
                  <td
                    className="r-gel edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={(e) => handleCompositionEnd(e, i, "rgel")}
                    onInput={(e) => changeCellValue(e, i, "rgel")}
                  >
                    {tableData.length > 0 && tableData[i].rgel}
                  </td>
                  <td
                    className="g-gel edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={(e) => handleCompositionEnd(e, i, "ggel")}
                    onInput={(e) => changeCellValue(e, i, "ggel")}
                  >
                    {tableData.length > 0 && tableData[i].ggel}
                  </td>
                  <td
                    className="b-gel edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={(e) => handleCompositionEnd(e, i, "bgel")}
                    onInput={(e) => changeCellValue(e, i, "bgel")}
                  >
                    {tableData.length > 0 && tableData[i].bgel}
                  </td>
                  <td
                    // className="r-dev-abnormal edit-color"
                    className="r-resist-small edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={(e) =>
                      // handleCompositionEnd(e, i, "rdevabnormal")
                      handleCompositionEnd(e, i, "rresistsmall")
                    }
                    // onInput={(e) => changeCellValue(e, i, "rdevabnormal")}
                    onInput={(e) => changeCellValue(e, i, "rresistsmall")}
                  >
                    {tableData.length > 0 && tableData[i].rresistsmall}
                  </td>
                  <td
                    className="g-resist-small edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={(e) =>
                      handleCompositionEnd(e, i, "gresistsmall")
                    }
                    onInput={(e) => changeCellValue(e, i, "gresistsmall")}
                  >
                    {tableData.length > 0 && tableData[i].gresistsmall}
                  </td>
                  <td
                    className="b-resist-small edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={(e) =>
                      handleCompositionEnd(e, i, "bresistsmall")
                    }
                    onInput={(e) => changeCellValue(e, i, "bresistsmall")}
                  >
                    {tableData.length > 0 && tableData[i].bresistsmall}
                  </td>
                  <td
                    className="r-fiber edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={(e) =>
                      handleCompositionEnd(e, i, "rfiber")
                    }
                    onInput={(e) => changeCellValue(e, i, "rfiber")}
                  >
                    {tableData.length > 0 && tableData[i].rfiber}
                  </td>
                  <td
                    className="g-fiber edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={(e) =>
                      handleCompositionEnd(e, i, "gfiber")
                    }
                    onInput={(e) => changeCellValue(e, i, "gfiber")}
                  >
                    {tableData.length > 0 && tableData[i].gfiber}
                  </td>
                  <td
                    className="b-fiber edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={(e) =>
                      handleCompositionEnd(e, i, "bfiber")
                    }
                    onInput={(e) => changeCellValue(e, i, "bfiber")}
                  >
                    {tableData.length > 0 && tableData[i].bfiber}
                  </td>
                  <td
                    className="bp edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={(e) => handleCompositionEnd(e, i, "bp")}
                    onInput={(e) => changeCellValue(e, i, "bp")}
                  >
                    {tableData.length > 0 && tableData[i].bp}
                  </td>
                  <td
                    className="bm-dirty edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={(e) =>
                      handleCompositionEnd(e, i, "bmdirty")
                    }
                    onInput={(e) => changeCellValue(e, i, "bmdirty")}
                  >
                    {tableData.length > 0 && tableData[i].bmdirty}
                  </td>
                  <td
                    className="repair edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={(e) =>
                      handleCompositionEnd(e, i, "repair")
                    }
                    onInput={(e) => changeCellValue(e, i, "repair")}
                  >
                    {tableData.length > 0 && tableData[i].repair}
                  </td>
                  <td
                    className="above-p edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={(e) =>
                      handleCompositionEnd(e, i, "abovep")
                    }
                    onInput={(e) => changeCellValue(e, i, "abovep")}
                  >
                    {tableData.length > 0 && tableData[i].abovep}
                  </td>
                  <td
                    className="back-dirty edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={(e) =>
                      handleCompositionEnd(e, i, "backdirty")
                    }
                    onInput={(e) => changeCellValue(e, i, "backdirty")}
                  >
                    {tableData.length > 0 && tableData[i].backdirty}
                  </td>
                  <td
                    className="dirty edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={(e) =>
                      handleCompositionEnd(e, i, "dirty")
                    }
                    onInput={(e) => changeCellValue(e, i, "dirty")}
                  >
                    {tableData.length > 0 && tableData[i].dirty}
                  </td>
                  <td
                    className="oven-drop edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={(e) =>
                      handleCompositionEnd(e, i, "ovendrop")
                    }
                    onInput={(e) => changeCellValue(e, i, "ovendrop")}
                  >
                    {tableData.length > 0 && tableData[i].ovendrop}
                  </td>
                  <td
                    className="black edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={(e) =>
                      handleCompositionEnd(e, i, "black")
                    }
                    onInput={(e) => changeCellValue(e, i, "black")}
                  >
                    {tableData.length > 0 && tableData[i].black}
                  </td>
                  {/* Glass Data新增defect type欄位 */}
                  {(() => {
                    const itemList = [];
                    const addColNum = othersColSpan - 5;
                    for (let col_num = 1; col_num <= addColNum; col_num++) {
                      itemList.push(
                        <td
                          key={`add-col-td-${i}-${col_num}`}
                          style={{ width: "2.5vw" }}
                          // className="edit-color"
                          className={`selfDefine_${col_num} edit-color`}
                          contentEditable={!editable}
                          suppressContentEditableWarning
                          onCompositionStart={handleCompositionStart}
                          onCompositionEnd={(e) =>
                            handleCompositionEnd(e, i, "otherdf", col_num)
                          }
                          onInput={(e) =>
                            changeCellValue(e, i, "otherdf", col_num)
                          }
                        >
                          {othersColSpan > 5 &&
                            Object.keys(tableData[i].otherdf).length > 0 &&
                            tableData[i].otherdf[`selfDefine_${col_num}`] &&
                            tableData[i].otherdf[`selfDefine_${col_num}`][
                              defectArr[24 + col_num - 1]
                            ]}
                        </td>
                      );
                    }
                    return itemList;
                  })()}
                  {/* Calculate FMA total */}
                  {(() => {
                    let itemList = [];
                    // console.log(tableData);
                    // console.log(defectArr);

                    tableData.forEach((e, id) => {
                      if (id === i) {
                        // let dfRowArr = [];
                        let dfCount = 0;
                        for (let j = 0; j < defectArr.length; j++) {
                          let defType = defectArr[j];
                          if (j < 24) {
                            defType = defType?.replaceAll("-", "");
                            dfCount += Number(e?.[defType]);
                          } else {
                            if (Object.keys(e.otherdf).length > 0) {
                              dfCount += Number(
                                e?.otherdf[`selfDefine_${j - 23}`][defectArr[j]]
                              );
                            }
                          }
                        }
                        itemList.push(
                          <td key={`fma-total-${i}`} className="fma-total">
                            {dfCount}
                          </td>
                        );
                      }
                    });
                    return itemList;
                  })()}
                  <td
                    className="s edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={(e) => handleCompositionEnd(e, i, "s")}
                    onInput={(e) => changeCellValue(e, i, "s")}
                  >
                    {tableData.length > 0 && tableData[i].s}
                  </td>
                  <td
                    className="m edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={(e) => handleCompositionEnd(e, i, "m")}
                    onInput={(e) => changeCellValue(e, i, "m")}
                  >
                    {tableData.length > 0 && tableData[i].m}
                  </td>
                  <td
                    className="l edit-color"
                    suppressContentEditableWarning
                    contentEditable={!editable}
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={(e) => handleCompositionEnd(e, i, "l")}
                    onInput={(e) => changeCellValue(e, i, "l")}
                  >
                    {tableData.length > 0 && tableData[i].l}
                  </td>
                  {/* <td className="df-sum">{calSmlTotal(i)}</td> */}
                  {calSmlTotal(i)}
                  <td
                    style={{
                      borderTopStyle: "hidden",
                      borderRightStyle: "hidden",
                      borderBottomStyle: "hidden",
                      padding: "0.2rem 0rem 0rem 0.2rem",
                      width: "2rem",
                    }}
                  >
                    <button
                      disabled={editable}
                      onClick={handleRowDelete}
                      className="trash-button"
                      style={{
                        border: "none",
                        cursor: "pointer",
                        background: "rgba(255,255,255,0)",
                      }}
                    >
                      <FaTrashAlt className="trash-button-icon" />
                    </button>
                  </td>
                </tr>
              );
            }
            return listItems;
          })()}
        </tbody>
        <tfoot>
          <tr className="total-num">
            <td colSpan="2">Total Num</td>
            {totalNum.map((e, i) => {
              return (
                <td key={`total-num-${i}`} className="df-total-num">
                  {e}
                </td>
              );
            })}
            {/* Total Num計算單枚總和 */}
            {<td className="df-total-all">{sumArr(totalNum)}</td>}
            {/* Avg of s-m-l data */}
            <td className="s-m-l-sum" colSpan={3}>
              Avg.
            </td>
            <td className="s-m-l-sum">
              {(sumArr(sheetTotal) / getNotEmptyRowLen()).toFixed(1)}
            </td>
          </tr>
          <tr className="avg-num">
            <td colSpan="2">Avg Num</td>
            {avgNum.map((e, i) => {
              return (
                <td key={`avg-num-${i}`} className="df-avg-num">
                  {e.toFixed(1).toString()}
                </td>
              );
            })}
            {/* Avg Num計算單枚總和 */}
            {
              <td className="fma-avg-all">
                {sumArr(avgNum).toFixed(1).toString()}
              </td>
            }
          </tr>
          <tr className="df-ratio">
            <td colSpan="2">百分比(%)</td>
            {ratioNum.map((e, i) => {
              return (
                <td key={`df-ratio-${i}`} className="df-ratio-num">
                  {(e * 100).toFixed(0).toString()}
                </td>
              );
            })}
            {/* 百分比計算單枚總和 */}
            {
              <td className="df-ratio-all">
                {(sumArr(ratioNum) * 100).toFixed(0).toString()}
              </td>
            }
          </tr>
          <tr className="acc-ratio">
            <td colSpan="2">累計百分比</td>
            {accRatioNum.map((e, i) => {
              return (
                <td key={`acc-ratio-${i}`} className="df-acc-num">
                  {(e * 100).toFixed(0).toString()}
                </td>
              );
            })}
            {
              <td className="df-acc-all">
                {(accRatioNum[accRatioNum.length - 1] * 100)
                  .toFixed(0)
                  .toString()}
              </td>
            }
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default FmaTableElement;
