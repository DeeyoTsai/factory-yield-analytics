import React, { useState, useEffect } from "react";
import FmaService from "../services/fma.service";
import { useNavigate } from "react-router-dom";
// import fmaService from "../services/fma.service";
import { useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./css/DatePickerStyles.css";
import { DEFECT_TYPES } from "../config/defectTypes";

// outline 的 first/second/third 可能存 key 或 code，統一轉成中文顯示名
const transDefect = Object.fromEntries(
  DEFECT_TYPES.flatMap((d) => [
    [d.key, d.label],
    [d.code, d.label],
  ])
);

const FmaQueryComponent = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { currentUser } = useAuth();
  const currentDate = new Date().toISOString().split("T")[0];

  let [employee, setEmployee] = useState("");
  let [lot, setLot] = useState("");
  let [line, setLine] = useState("");
  let [product, setProduct] = useState("");
  let [sdate, setSdate] = useState(new Date());
  let [edate, setEdate] = useState(new Date());
  let [rowdata, setRowdata] = useState("");
  let [message, setMessage] = useState("");

  const handleEmployee = (e) => {
    setEmployee(e.target.value);
  };
  const handleLot = (e) => {
    setLot(e.target.value);
  };
  const handleSDate = (date) => {
    setSdate(date);
  };
  const handleEDate = (date) => {
    setEdate(date);
  };
  const handleLine = (e) => {
    setLine(e.target.value);
  };
  const handleProduct = (e) => {
    setProduct(e.target.value);
  };
  const handleQuery = async () => {
    // 將 Date 對象轉換為 YYYY-MM-DD 格式
    const sdateFormatted = sdate.toISOString().split("T")[0];
    const edateFormatted = edate.toISOString().split("T")[0];

    let response = await FmaService.query(
      employee,
      lot,
      line,
      product,
      sdateFormatted,
      edateFormatted
    );

    setRowdata(response);

    // if (rowdata !== "" && rowdata.data.foundData.length > 0) {
    //   console.log(rowdata);
    // }
  };
  const handleCheckEdit = (e) => {
    const id = e.currentTarget.parentElement.parentElement.parentElement.id;

    navigate("/queryResult", {
      state: {
        rowData: JSON.stringify(rowdata),
        id: id,
        queryEmp: employee,
        queryLot: lot,
        queryLine: line,
        queryProduct: product,
        querySdate: sdate,
        queryEdate: edate,
      },
    });
    // console.log(e);
  };
  const handleDelete = async (e) => {
    // console.log(e.currentTarget.parentElement.parentElement.parentElement.id);
    const id = e.currentTarget.parentElement.parentElement.parentElement.id;
    const confirmed = window.confirm("確定要刪除這筆資料嗎?");
    try {
      if (confirmed) {
        let response = await FmaService.deleteOutlineRow(id);
        setMessage(response.data.msg);
        setTimeout(() => {
          setMessage("");
          handleQuery();
        }, 2500);
      }
    } catch (e) {
      console.log(e);
      setMessage(e.response.data.msg);
    }
  };

  useEffect(() => {
    // 如果沒有 state (直接進入頁面)，設定日期預設為今天
    if (!state) {
      setSdate(new Date());
      setEdate(new Date());
    } else {
      let savedData = JSON.parse(state.rowData);
      // 有 state 時從 state 恢復數據
      setRowdata(savedData);
      let queryItems = savedData.config.url.split("/");
      queryItems = queryItems[queryItems.length - 1];
      const [emp, lt, ln, pd, startdate, enddate] = queryItems.split("_");
      setEmployee(emp);
      setLot(lt);
      setLine(ln);
      setProduct(pd);
      setSdate(startdate ? new Date(startdate) : new Date());
      setEdate(enddate ? new Date(enddate) : new Date());
    }
  }, [state, currentDate]);

  return (
    <div className="fma-data-query" style={{ padding: "2.5rem" }}>
      <div className="card text-center" style={{ marginBottom: "1.5rem" }}>
        <h3 className="card-header">請提供查詢資料</h3>
        <div className="card-body mt-3 me-3">
          <div className="d-flex justify-content-center align-items-center mb-2">
            <div id="employee" className="d-flex me-3 w-50">
              <label
                htmlFor="employee"
                className="col-sm-2 col-form-label"
                // style={{ width: "3rem" }}
              >
                工號:
              </label>
              <input
                value={employee}
                onChange={handleEmployee}
                type="text"
                className="form-control"
                name="employee"
                placeholder="請輸入FMA人員工號"
              />
            </div>
            <div id="lot" className="d-flex w-50">
              <label htmlFor="lot" className="col-sm-2 col-form-label ">
                LOT:
              </label>
              <input
                value={lot}
                onChange={handleLot}
                type="text"
                className="form-control"
                name="lot"
                placeholder="請輸入LOT"
              />
            </div>
          </div>
          <div className="d-flex justify-content-center align-items-center mb-2">
            <div id="line" className="d-flex me-3 w-50">
              <label htmlFor="line" className="col-sm-2 col-form-label">
                產線:
              </label>
              <select
                onChange={handleLine}
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
              <label
                htmlFor="product"
                className="col-sm-2 col-form-label"
                // style={{ width: "3rem" }}
              >
                品名:
              </label>
              <input
                value={product}
                onChange={handleProduct}
                type="text"
                className="form-control"
                name="product"
                placeholder="ex:PNL-B156"
              />
            </div>
          </div>
          <div className="d-flex justify-content-center align-items-center mb-4">
            <div id="sdate" className="d-flex me-3 w-50">
              <label
                htmlFor="sdate"
                className="col-sm-2 col-form-label flex-grow-1"
              >
                開始日期:
              </label>
              <DatePicker
                selected={sdate}
                onChange={handleSDate}
                className="form-control flex-shrink-1 me-2"
                dateFormat="yyyy-MM-dd"
                id="sdate"
                name="sdate"
                minDate={new Date("2018-01-01")}
                maxDate={new Date()}
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                wrapperClassName="full-width-datepicker"
              />
            </div>
            <div id="edate" className="d-flex w-50">
              <label
                htmlFor="edate"
                className="col-sm-2 col-form-label flex-grow-1"
              >
                結束日期:
              </label>
              <div style={{ width: "100%", padding: "0px", margin: "0px" }}>
                <DatePicker
                  selected={edate}
                  onChange={handleEDate}
                  className="form-control"
                  dateFormat="yyyy-MM-dd"
                  id="edate"
                  name="edate"
                  minDate={new Date("2018-01-01")}
                  maxDate={new Date()}
                  showYearDropdown
                  showMonthDropdown
                  dropdownMode="select"
                  wrapperClassName="full-width-datepicker"
                />
              </div>
            </div>
          </div>
          <button className="btn btn-primary btn-lg m-1" onClick={handleQuery}>
            <span>查詢資料</span>
          </button>
        </div>
      </div>
      {message && (
        <div className="alert alert-danger text-center">{message}</div>
      )}
      {rowdata !== "" && rowdata.data.foundData.length > 0 && (
        <table className="table table-hover">
          <thead>
            <tr className="table-dark">
              <th
                rowSpan={2}
                className="align-middle"
                style={{ textAlign: "center" }}
              >
                日期
              </th>
              <th
                rowSpan={2}
                className="align-middle"
                style={{ textAlign: "center" }}
              >
                FMA人員
              </th>
              <th
                rowSpan={2}
                className="align-middle"
                style={{ textAlign: "center" }}
              >
                站別
              </th>
              <th
                rowSpan={2}
                className="align-middle"
                style={{ textAlign: "center" }}
              >
                品種
              </th>
              <th
                rowSpan={2}
                className="align-middle"
                style={{ textAlign: "center" }}
              >
                LOT
              </th>
              <th
                colSpan={3}
                className="align-middle border-bottom-0"
                style={{ textAlign: "center" }}
              >
                Defect前三名
              </th>
              <th
                rowSpan={2}
                className="align-middle"
                style={{ textAlign: "center" }}
              >
                編輯
              </th>
            </tr>
            <tr className="table-dark align-middle fs-6">
              <th style={{ textAlign: "center" }}>1st</th>
              <th style={{ textAlign: "center" }}>2nd</th>
              <th style={{ textAlign: "center" }}>3rd</th>
            </tr>
          </thead>
          <tbody>
            {/* {rowdata.data.foundData} */}
            {rowdata.data.foundData.map((e) => {
              ["first", "second", "third"].map((p) => {
                if (e[p]) {
                  let defectName = e[p].split("-");
                  const defectPercent = defectName.slice(
                    defectName.length - 1,
                    defectName.length
                  )[0];
                  if (defectName.length > 2) {
                    defectName = defectName.slice(0, defectName.length - 1);
                    defectName = defectName.join("");
                  }
                  if (transDefect[defectName]) {
                    const newDefectName =
                      transDefect[defectName] + "-" + defectPercent;
                    e[p] = newDefectName;
                  }
                }
              });

              // 檢查當前用戶是否可以編輯/刪除此資料
              const canUserEdit =
                currentUser?.level === "admin" ||
                currentUser?.level === "super" ||
                e.emp === currentUser?.employee;

              return (
                <tr id={e.id} key={e.id}>
                  <td className="text-center">
                    {new Date(e.datetime).toLocaleString("sv")}
                  </td>
                  <td className="text-center">{e.emp}</td>
                  <td className="text-center">{e.line}</td>
                  <td className="text-center">{e.product}</td>
                  <td className="text-center">{e.lot}</td>
                  <td className="text-center">{e.first}</td>
                  <td className="text-center">{e.second}</td>
                  <td className="text-center">{e.third}</td>
                  <td>
                    <div className="edit-btns d-flex justify-content-center">
                      <button
                        type="button"
                        className="btn btn-success btn-sm me-1"
                        onClick={handleCheckEdit}
                      >
                        <span>查詢{canUserEdit ? "與編輯" : ""}</span>
                      </button>
                      {canUserEdit && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={handleDelete}
                        >
                          <span>刪除</span>
                        </button>
                      )}
                      {!canUserEdit && (
                        <div
                          className="text-muted small ms-2"
                          style={{ fontSize: "0.75rem" }}
                        >
                          <i className="fas fa-lock"></i>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default FmaQueryComponent;
