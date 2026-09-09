import * as React from "react";
import Typography from "@mui/material/Typography";
import { BarChart } from "@mui/x-charts/BarChart";

export default function BasicBars({
  data = [],
  stackedData = [],
  stackedSeries = [],
  loading = false,
  title = "生產線產量統計",
  isStacked = false,
}) {
  const config = {
    height: 500,
    margin: { left: 20, right: 20 },
    yAxis: [
      {
        label: "Amount",
        width: 50,
        valueFormatter: (value) => (isStacked ? `${value}` : `${value}`),
      },
    ],
  };

  // 預設數據
  const defaultData = [{ line: "無數據", count: 0 }];

  // 處理 defect type 堆疊長條圖資料
  if (
    isStacked &&
    stackedData &&
    stackedData.length > 0 &&
    stackedSeries &&
    stackedSeries.length > 0
  ) {
    // console.log(stackedData);
    // console.log(stackedSeries);

    return (
      <div className="card p-2" style={{ width: "100%" }}>
        <Typography variant="h6" align="center" className="mb-3">
          {title}
        </Typography>
        <BarChart
          dataset={stackedData}
          series={stackedSeries}
          grid={{ horizontal: true }}
          // barLabel={(value, context) => {
          //   console.log(value);
          //   console.log(context);

          //   // 只在堆疊的最上方顯示總數
          //   const { dataIndex, seriesIndex } = context;
          //   const isLastSeries = seriesIndex === stackedSeries.length - 1;

          //   if (isLastSeries && stackedData[dataIndex]) {
          //     return stackedData[dataIndex].total || "";
          //   }
          //   return "";
          // }}
          barLabel="value"
          xAxis={[
            {
              dataKey: "defectType",
              label: "Defect Type",
              width: 30,
              height: 100,
              tickLabelStyle: {
                angle: -45, // Rotate labels by -45 degrees
                textAnchor: "end", // Align the end of the label with the tick
                fontSize: 12, // Optional: Adjust font size
              },
            },
          ]}
          slotProps={{ tooltip: { trigger: "item" } }}
          {...config}
        />
      </div>
    );
  }

  const chartData = data && data.length > 0 ? data : defaultData;

  if (loading) {
    return (
      <div className="card p-2" style={{ width: "100%" }}>
        <div className="text-center p-4">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">載入中...</span>
          </div>
          <Typography className="mt-2">{title} - 載入中...</Typography>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-2" style={{ width: "100%" }}>
      <Typography variant="h6" align="center" className="mb-3">
        {title}
      </Typography>
      <BarChart
        dataset={chartData}
        series={[
          {
            dataKey: "count",
            label: "批次數量",
            color: "#1976d2",
          },
        ]}
        xAxis={[
          {
            dataKey: "line",
            label: "Defect Type By Phase",
          },
        ]}
        {...config}
      />
    </div>
  );
}
