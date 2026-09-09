import React, { useState, useEffect } from "react";
import InputFormElement from "./elements/input-form-element";
import { useAuth } from "../contexts/AuthContext";
import { useFma } from "../contexts/FmaContext";
// import FmaTableElement from "./elements/fma-table-element";

const FmaTableComponent = () => {
  const { currentUser } = useAuth();
  const {
    defectArr,
    setDefectArr,
    // defectArrRef,
    othersColSpan,
    setOthersColSpan,
  } = useFma();
  const title = "FMA填寫表格";
  // const btnValue = "送出表單";
  //======FMA填寫表格======
  //variant props for input-form-element.js
  const currentDate = new Date().toLocaleDateString("sv");
  // const currentDateTime = new Date().toLocaleString("sv");

  let [employee, setEmployee] = useState(
    currentUser?.employee ? currentUser.employee : ""
  );
  let [pickdate, setPickdate] = useState(currentDate);
  let [line, setLine] = useState("");
  let [product, setProduct] = useState("");
  //   let [rowdata, setRowdata] = useState("");

  useEffect(() => {
    if (currentUser?.employee) {
      setEmployee(currentUser.employee);
    }
  }, [currentUser]);
  return (
    <div className="fma-table-component">
      <InputFormElement
        cardHeader={title}
        // btnClick={handleBtnEvent}
        // btnValue={btnValue}
        currentUser={currentUser}
        currentDate={currentDate}
        // currentDateTime={currentDateTime}
        employee={employee}
        setEmployee={setEmployee}
        pickdate={pickdate}
        setPickdate={setPickdate}
        line={line}
        setLine={setLine}
        product={product}
        setProduct={setProduct}
        defectArr={defectArr}
        // defectArrRef={defectArrRef}
        setDefectArr={setDefectArr}
        othersColSpan={othersColSpan}
        setOthersColSpan={setOthersColSpan}
      />
      {/* <FmaTableElement /> */}
    </div>
  );
};

export default FmaTableComponent;
