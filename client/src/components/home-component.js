import { useEffect, useState } from "react";
import DateRangePicker from "@wojtekmaj/react-daterange-picker";
import "@wojtekmaj/react-daterange-picker/dist/DateRangePicker.css";
import "./css/home-component.css";
import DashboardOutlineTable from "./elements/dashboard-outline-table";
import DonutChart from "./elements/dashboard-donut-chart";
import BasicBars from "./elements/dashboard-bar-chart";
import { useDashboard } from "../contexts/DashboardContext";
// import ArcDesign from "./elements/dashboard-gauge-chart";
import FavoriteTwoToneIcon from "@mui/icons-material/FavoriteTwoTone";
import ScheduleTwoToneIcon from "@mui/icons-material/ScheduleTwoTone";
import PrecisionManufacturingTwoToneIcon from "@mui/icons-material/PrecisionManufacturingTwoTone";
import CoronavirusTwoToneIcon from "@mui/icons-material/CoronavirusTwoTone";
import RectangleTwoToneIcon from "@mui/icons-material/RectangleTwoTone";
import InsertChartTwoToneIcon from "@mui/icons-material/InsertChartTwoTone";
import ImageService from "../services/image.service";

const HomeComponent = () => {
  const {
    healthCondition,
    dateRange,
    dashboardData,
    loading,
    error,
    updateDateRange,
    getStatisticsSummary,
    // getDefectDistribution,
    // getDefectDistributionByPhase,
    getDefectDistributionByLine,
    // getProductionLineData,
    // getStackedBarData,
    // getStackedBarSeries,
    getStackedBarDataByLine,
    getStackedBarSeriesByLine,
    getModelHealthCondition,
    clearError,
  } = useDashboard();

  const [modelMtime, setModelMtime ] = useState("")
  // const [healthCondition, setHealthCondition] = useState("??");
  const summary = getStatisticsSummary();
  // const defectData = getDefectDistribution();
  // const defectDataByPhase = getDefectDistributionByPhase();
  const defectDataByLine = getDefectDistributionByLine();
  // const productionData = getProductionLineData();
  // const stackedData = getStackedBarData();
  // const stackedSeries = getStackedBarSeries();
  const stackedDataByLine = getStackedBarDataByLine();
  const stackedSeriesByLine = getStackedBarSeriesByLine();
  const modelHealthCond = getModelHealthCondition();

  // 計算堆疊長條圖第一名作為良品率顯示
  const topDefectType =
    stackedDataByLine.length > 0 ? stackedDataByLine[0].defectType : "無資料";

  // 更新summary的defectRate
  const updatedSummary = summary
    ? {
        ...summary,
        defectRate: topDefectType,
      }
    : summary;

  // 初始載入數據
  useEffect(() => {
    console.log(healthCondition);

    if (dateRange && dateRange[0] && dateRange[1]) {
      updateDateRange(dateRange);
    }
  }, [dateRange, updateDateRange]);

  // Line DonutChart - 按生產線生成甜甜圈圖，分兩列顯示
  const renderLineDonutCharts = () => {
    const firstRowLines = ["L1", "L2", "L3"];
    const secondRowLines = ["L4", "L5", "L6"];

    const renderLineRow = (lines) => (
      <div className="row  mb-3">
        {lines.map((line) => (
          <div key={line} className="col-md-4">
            <DonutChart
              title={`${line}`}
              data={defectDataByLine[line] || []}
              loading={loading}
            />
          </div>
        ))}
      </div>
    );

    return (
      <>
        {renderLineRow(firstRowLines)}
        {renderLineRow(secondRowLines)}
      </>
    );
  };

  // useEffect(() => {
  //   const data = modelHealthCond;
  //   console.log(data);

  //   setHealthCondition(modelHealthCond);
  // }, [modelHealthCond]);
  useEffect(() => {
    const fetchData = async ()=>{
      try {
        const response = await ImageService.getModelMtime()
        const modelDate = new Date(response.data.mtime).toLocaleDateString()
        setModelMtime(modelDate)
      } catch (error) {
        console.log(error);
        
      }
    }
    fetchData();
    
  }, [])

  return (
    <main>
      <div className="px-4 py-3 m-2">
        <div className="d-flex align-items-center flex-wrap mb-4">
          <div className="me-auto p-2">
            <h1 className="fw-bold">Dashboard</h1>
          </div>
          <div className="px-3">
            <h5 className="px-1 mt-3">請輸入日期:</h5>
            {/* <div className="custom-date-range-picker"> */}
            <DateRangePicker
              className="mb-2 custom-date-range-picker"
              format="y-MM-dd"
              onChange={updateDateRange}
              value={dateRange}
            />
            {/* </div> */}
          </div>
        </div>

        {/* 載入狀態 */}
        {loading && (
          <div className="text-center py-4">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">載入中...</span>
            </div>
            <p className="mt-2">正在載入數據...</p>
          </div>
        )}

        {/* 錯誤提示 */}
        {error && (
          <div className="alert alert-danger alert-dismissible" role="alert">
            {error}
            <button
              type="button"
              className="btn-close"
              onClick={clearError}
              aria-label="Close"
            ></button>
          </div>
        )}

        {/* 統計數據總覽 */}
        {updatedSummary && !loading && (
          <div className="row mb-4 px-1">
            {/* <div className="col-md-4 gx-3"> */}
            <div className="col-md-2 mb-1">
              <div className="card bg-primary text-white">
                <div className="card-body">
                  <h5 className="card-title">
                    <InsertChartTwoToneIcon />
                    &nbsp;
                    <span className="align-middle">次數</span>
                  </h5>
                  <h3>{updatedSummary.totalOutlines}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-2 mb-1">
              <div className="card bg-success text-white">
                <div className="card-body">
                  <h5 className="card-title">
                    <RectangleTwoToneIcon />
                    &nbsp;
                    <span className="align-middle">Sheet</span>
                  </h5>
                  <h3>{updatedSummary.totalGlasses}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-2 mb-1">
              <div className="card bg-warning text-white">
                <div className="card-body">
                  <h5 className="card-title">
                    <PrecisionManufacturingTwoToneIcon />
                    &nbsp;
                    <span className="align-middle">Lines</span>
                  </h5>
                  <h3>{updatedSummary.totalDefects}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-2 mb-1">
              <div className="card bg-info text-white">
                <div className="card-body">
                  <h5 className="card-title">
                    <CoronavirusTwoToneIcon />
                    &nbsp;
                    <span className="align-middle">TOP Defect</span>
                  </h5>
                  <h3>{updatedSummary.defectRate}</h3>
                </div>
              </div>
            </div>
            <div className="col-md-2 mb-1">
              <div
                className="card text-white"
                style={{ backgroundColor: "#9FA4A9" }}
              >
                <div className="card-body">
                  <h5 className="card-title">
                    <FavoriteTwoToneIcon />
                    &nbsp;
                    <span className="align-middle">模型健康度</span>
                  </h5>
                  <h3>{healthCondition} %</h3>
                </div>
              </div>
            </div>
            <div className="col-md-2">
              <div
                className="card text-white"
                style={{ backgroundColor: "#817A74" }}
              >
                <div className="card-body">
                  <h5 className="card-title">
                    <ScheduleTwoToneIcon />
                    &nbsp;
                    <span className="align-middle">模型更新時間</span>
                  </h5>
                  <h3>{modelMtime}</h3>
                </div>
              </div>
            </div>
            {/* </div> */}

            {/* <div className="col-md-8">
              <div className="h-100 text-white bg-dark rounded-3">
                <div className="health-icon round-full p-3">
                  <FavoriteTwoToneIcon />
                </div>
                <ArcDesign />
              </div>
            </div> */}
          </div>
          // <div className="row col-md-6"></div>
        )}

        <div className="outline-table mb-4">
          <DashboardOutlineTable data={dashboardData || []} loading={loading} />
        </div>

        <div className="outline-donut mt-4">
          <div className="container-fluid">{renderLineDonutCharts()}</div>
        </div>

        <div className="outline-bar mt-4">
          <BasicBars
            stackedData={stackedDataByLine}
            stackedSeries={stackedSeriesByLine}
            loading={loading}
            title="各缺陷類型按生產線堆疊統計"
            isStacked={true}
          />
        </div>
      </div>
    </main>
  );
};

export default HomeComponent;
