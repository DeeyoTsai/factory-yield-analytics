import * as React from "react";
import { PieChart } from "@mui/x-charts/PieChart";
import { Box, Typography } from "@mui/material";

const settings = {
  margin: { right: 4 },
  width: 250,
  height: 250,
  hideLegend: true,
};

export default function DonutChart({
  title = "數據圖表",
  data = [],
  loading = false,
}) {
  // 計算前三大 defect
  const getTopThreeDefects = (data) => {
    if (!data || data.length === 0) return [];
    console.log(data);

    return data
      .filter((item) => item.label !== "無數據") // 排除預設數據
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map((item) => item.label + "-" + String(item.value));
  };

  // 處理數據：如果無資料，使用透明的預設資料保持 donut 形狀
  const hasRealData = data && data.length > 0;
  // console.log(data);

  const chartData = hasRealData
    ? data
    : [{ label: "無數據", value: 1, color: "#F5F5F5" }];
  // const totalValue = hasRealData
  //   ? chartData.reduce((sum, item) => sum + item.value, 0)
  //   : 0;
  const topThreeDefects = getTopThreeDefects(data);
  if (loading) {
    return (
      <div className="card p-2 my-1">
        <div className="text-center p-4">
          <div className="spinner-border spinner-border-sm" role="status">
            <span className="visually-hidden">載入中...</span>
          </div>
          <p className="mt-2 small">{title}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-2 my-1">
      <div className="text-center mb-2">
        <Typography variant="h6" color="textSecondary">
          {title}
        </Typography>
      </div>
      <Box sx={{ position: "relative" }}>
        <PieChart
          series={[
            {
              data: chartData,
              innerRadius: 80,
              outerRadius: 120,
              arcLabel: hasRealData ? "value" : null,
            },
          ]}
          {...settings}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            pointerEvents: "none",
            fontSize: "11px",
            fontWeight: "bold",
            maxWidth: "120px",
          }}
        >
          {hasRealData && topThreeDefects.length > 0 ? (
            <div>
              <div
                style={{ fontSize: "20px", marginBottom: "4px", color: "#333" }}
              >
                Top 3
              </div>
              {topThreeDefects.map((defect, index) => (
                <div
                  key={index}
                  style={{
                    fontSize: "14px",
                    color: "#666",
                    lineHeight: "1.2",
                    marginBottom: "1px",
                  }}
                >
                  {index + 1}. {defect}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: "12px", color: "#999" }}>無資料</div>
          )}
        </div>
      </Box>
    </div>
  );
}
