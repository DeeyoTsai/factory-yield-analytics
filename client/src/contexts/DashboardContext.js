import React, { createContext, useContext, useState, useCallback } from "react";
import FmaService from "../services/fma.service";
import ImageService from "../services/image.service";
import { DEFECT_TYPES } from "../config/defectTypes";

// fmatb 欄位 key -> 顯示標籤（刮傷 / 異物 …）
const TRANS_DEFECT = Object.fromEntries(DEFECT_TYPES.map((d) => [d.key, d.label]));
// YOLO detector 的 class 名 -> fmatb 欄位 key（YOLO 預填 FMA 表格用）
const LABELED_DEFECT = Object.fromEntries(DEFECT_TYPES.map((d) => [d.yolo, d.key]));

const DashboardContext = createContext();

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
};

export const DashboardProvider = ({ children }) => {
  // 預設看最近 14 天（demo 資料鋪了約 3 週，範圍太窄畫面會空）
  const [dateRange, setDateRange] = useState([
    new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    new Date(),
  ]);
  const [dashboardData, setDashboardData] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [healthCondition, setHealthCondition] = useState("??");

  const transDefect = TRANS_DEFECT;
  const labeledDefect = LABELED_DEFECT;

  // 格式化日期為 YYYY-MM-DD
  const formatDate = useCallback((date) => {
    return date.toISOString().split("T")[0];
  }, []);

  // 獲取Dashboard數據
  const fetchDashboardData = useCallback(
    async (startDate, endDate) => {
      setLoading(true);
      setError(null);

      try {
        const formattedStartDate = formatDate(startDate);
        const formattedEndDate = formatDate(endDate);

        // 獲取統計數據
        const statsResponse = await FmaService.getStatistics(
          formattedStartDate,
          formattedEndDate
        );

        (statsResponse.data.rawData || []).forEach((e) => {
          ["first", "second", "third"].forEach((p) => {
            if (typeof e[p] !== "string" || !e[p]) return;
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
          });
        });
        setStatistics(statsResponse.data.statistics);
        setDashboardData(statsResponse.data.rawData);

        return { success: true };
      } catch (error) {
        console.error("獲取Dashboard數據失敗:", error);
        const errorMessage =
          error.response?.data?.msg || "獲取數據失敗，請稍後再試";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [formatDate]
  );

  // 更新日期範圍並獲取數據
  const updateDateRange = useCallback(
    async (newDateRange) => {
      setDateRange(newDateRange);
      if (newDateRange && newDateRange[0] && newDateRange[1]) {
        await fetchDashboardData(newDateRange[0], newDateRange[1]);
      }
    },
    [fetchDashboardData]
  );

  // 刷新當前日期範圍的數據
  const refreshData = useCallback(() => {
    if (dateRange && dateRange[0] && dateRange[1]) {
      return fetchDashboardData(dateRange[0], dateRange[1]);
    }
  }, [dateRange, fetchDashboardData]);

  // 清除錯誤
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 獲取統計摘要
  const getStatisticsSummary = useCallback(() => {
    if (!statistics) return null;

    // 獲取生產線keys，以"、"間隔顯示
    const productionLines = statistics.productionByLine
      ? Object.keys(statistics.productionByLine)
      : [];
    const productionLinesDisplay =
      productionLines.length > 0 ? productionLines.join("、") : "無資料";

    return {
      totalOutlines: statistics.totalOutlines || 0,
      totalGlasses: statistics.totalGlasses || 0,
      totalDefects: productionLinesDisplay, // 改為顯示生產線
      productionLines: Object.keys(statistics.productionByLine || {}).length,
      defectRate: "載入中...", // 暫時顯示，需要在組件中計算第一名
    };
  }, [statistics]);

  // 獲取缺陷分佈數據（用於甜甜圈圖）
  // const getDefectDistribution = useCallback(() => {
  //   if (statistics && statistics.productionByLine) {
  //     console.log(statistics.productionByLine);
  //   }

  //   if (!statistics || !statistics.defectSummary) return [];

  //   const colors = {
  //     runder: "#FF6384",
  //     gunder: "#36A2EB",
  //     rwp: "#FFCE56",
  //     rgel: "#4BC0C0",
  //   };

  //   const defectLabels = {
  //     runder: "R-Under",
  //     gunder: "G-Under",
  //     rwp: "R-WP",
  //     rgel: "R-Gel",
  //   };

  //   return Object.entries(statistics.defectSummary)
  //     .filter(([key, value]) => value > 0)
  //     .map(([key, value]) => ({
  //       label: defectLabels[key] || key,
  //       value,
  //       color: colors[key] || "#999999",
  //     }));
  // }, [statistics]);

  // 獲取按 Phase 分組的缺陷分佈數據（用於甜甜圈圖）
  // const getDefectDistributionByPhase = useCallback(() => {
  //   if (!statistics || !statistics.defectsByPhase) return {};

  //   const colors = [
  //     "#FF6384",
  //     "#36A2EB",
  //     "#FFCE56",
  //     "#4BC0C0",
  //     "#9966FF",
  //     "#FF9F40",
  //     "#FF6384",
  //     "#C9CBCF",
  //     "#4BC0C0",
  //     "#FF6384",
  //   ];

  //   const result = {};
  //   Object.entries(statistics.defectsByPhase).forEach(([phase, defects]) => {
  //     if (Object.keys(defects).length > 0) {
  //       result[phase] = Object.entries(defects)
  //         .filter(([_, value]) => value > 0)
  //         .sort(([, a], [, b]) => b - a)
  //         .slice(0, 10)
  //         .map(([defectType, count], index) => ({
  //           label: defectType,
  //           value: count,
  //           color: colors[index % colors.length],
  //         }));
  //     }
  //   });
  //   return result;
  // }, [statistics]);

  // 獲取生產線統計數據（用於長條圖）
  // const getProductionLineData = useCallback(() => {
  //   if (!statistics || !statistics.productionByLine) return [];

  //   return Object.entries(statistics.productionByLine).map(([line, count]) => ({
  //     line,
  //     count,
  //   }));
  // }, [statistics]);

  // 獲取按生產線分佈的甜甜圈圖數據
  const getDefectDistributionByLine = useCallback(() => {
    if (!dashboardData || dashboardData.length === 0) return {};

    const lines = ["L1", "L2", "L3", "L4", "L5", "L6"];
    const colors = [
      "#FF6384",
      "#36A2EB",
      "#FFCE56",
      "#4BC0C0",
      "#9966FF",
      "#FF9F40",
      "#d6909fff",
      "#C9CBCF",
    ];

    const result = {};
    // console.log(dashboardData);

    lines.forEach((line) => {
      // 篩選該生產線的數據
      const lineData = dashboardData.filter((item) => item.line === line);
      // console.log(lineData);

      if (lineData.length === 0) {
        // 無資料時返回空數組，讓甜甜圈圖組件顯示無資料狀態
        result[line] = [];
        return;
      }

      // 計算該生產線的缺陷統計
      const defectCounts = {};
      lineData.forEach((outline) => {
        // 統計該outline的所有缺陷
        const glasses = outline.fmatbs || [];
        glasses.forEach((glass) => {
          // console.log(glass);

          // 遍歷該玻璃片的所有缺陷欄位
          Object.keys(glass).forEach((key) => {
            // 跳過非缺陷欄位
            if (
              [
                "id",
                "gid",
                "date",
                "outlineId",
                "s",
                "m",
                "l",
                "createdAt",
                "updatedAt",
                // "otherdf",
              ].includes(key)
            ) {
              return;
            }
            // 加入自定義defect
            if (key === "otherdf" && glass[key].length > 0) {
              glass[key].forEach((e, i) => {
                // console.log(Object.keys(e)[0]);
                const addDefect = Object.keys(e)[0];
                let addDfValue = parseInt(e[addDefect]);

                if (addDfValue > 0) {
                  // if (!defectCounts[addDefect]) {
                  //   defectCounts[addDefect] = 0;
                  // }
                  // defectCounts[addDefect] =
                  //   defectCounts[addDefect] + addDfValue;
                  // console.log(addDfValue);
                  defectCounts[addDefect] =
                    (defectCounts[addDefect] || 0) + addDfValue;
                }
              });
            }

            const value = parseInt(glass[key]) || 0;
            if (value > 0) {
              // console.log(Object.keys(defectCounts));
              if (Object.keys(defectCounts).includes(transDefect[key])) {
                defectCounts[transDefect[key]] =
                  defectCounts[transDefect[key]] + value;
              } else {
                defectCounts[transDefect[key]] =
                  (defectCounts[key] || 0) + value;
              }
            }
          });
        });
      });

      // 轉換為甜甜圈圖格式，取前8名
      const sortedDefects = Object.entries(defectCounts)
        .filter(([_, count]) => count > 0)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([defectType, count], index) => ({
          label: defectType,
          value: count,
          color: colors[index % colors.length],
        }));

      result[line] = sortedDefects;
    });

    return result;
  }, [dashboardData]);

  // 各缺陷類型（12 類）依生產線 L1..L6 堆疊。資料直接取後端 statistics.stackedBarData。
  const getStackedBarDataByLine = useCallback(() => {
    const sbd = statistics && statistics.stackedBarData;
    if (!sbd) return [];
    const LINE_KEYS = ["L1", "L2", "L3", "L4", "L5", "L6"];
    return Object.entries(sbd)
      .map(([key, byLine]) => {
        const row = { defectType: TRANS_DEFECT[key] || key };
        let total = 0;
        for (const ln of LINE_KEYS) {
          row[ln] = byLine[ln] || 0;
          total += row[ln];
        }
        row.total = total;
        return row;
      })
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total);
  }, [statistics]);

  const getStackedBarSeriesByLine = useCallback(() => {
    const palette = ["#2E96FF", "#02B2AF", "#B800D8", "#60009B", "#2731C8", "#03008D"];
    return ["L1", "L2", "L3", "L4", "L5", "L6"].map((ln, i) => ({
      dataKey: ln,
      label: ln,
      color: palette[i],
      stack: "byLine",
    }));
  }, []);

  // 獲取堆疊長條圖數據（按 defect type 分組，每個 defect type 顯示兩個 phase 的 product 堆疊）
  // const getStackedBarData = useCallback(() => {
  //   if (!statistics || !statistics.stackedBarData) return [];

  //   const stackedData = [];

  //   // 遍歷每個 defect type
  //   Object.entries(statistics.stackedBarData).forEach(
  //     ([defectType, phases]) => {
  //       const defectEntry = {
  //         defectType: defectType,
  //         total: 0, // 新增總數欄位
  //       };

  //       // 為每個 phase-product 組合建立資料欄位，只包含有數值的項目
  //       Object.entries(phases).forEach(([phase, products]) => {
  //         Object.entries(products).forEach(([product, count]) => {
  //           // 只有當數量大於 0 時才加入
  //           if (count && Number(count) > 0) {
  //             const fieldName = `phase${phase}_${product}`;
  //             defectEntry[fieldName] = count;
  //             defectEntry.total += Number(count); // 累加到總數
  //           }
  //         });
  //       });

  //       // 只有當有資料時才加入
  //       const hasData = Object.keys(defectEntry).length > 2; // 除了 defectType 和 total 還有其他欄位
  //       if (hasData) {
  //         stackedData.push(defectEntry);
  //       }
  //     }
  //   );

  //   // 按總數遞減排序
  //   stackedData.sort((a, b) => b.total - a.total);

  //   return stackedData;
  // }, [statistics]);

  // 獲取堆疊長條圖的系列配置
  // const getStackedBarSeries = useCallback(() => {
  //   if (!statistics || !statistics.stackedBarData) return [];

  //   const series = [];
  //   const productColors = new Map();
  //   const baseColors = [
  //     "#4CAF50",
  //     "#2196F3",
  //     "#FF9800",
  //     "#E91E63",
  //     "#9C27B0",
  //     "#00BCD4",
  //     "#795548",
  //     "#607D8B",
  //   ];
  //   let productColorIndex = 0;

  //   // 收集所有有數據的產品並分配顏色
  //   const allProducts = new Set();
  //   Object.values(statistics.stackedBarData).forEach((phases) => {
  //     Object.values(phases).forEach((products) => {
  //       Object.entries(products).forEach(([product, count]) => {
  //         // 只收集有數值的產品
  //         if (count && Number(count) > 0) {
  //           allProducts.add(product);
  //         }
  //       });
  //     });
  //   });

  //   // 為每個產品分配基礎顏色
  //   allProducts.forEach((product) => {
  //     if (!productColors.has(product)) {
  //       productColors.set(
  //         product,
  //         baseColors[productColorIndex % baseColors.length]
  //       );
  //       productColorIndex++;
  //     }
  //   });

  //   // 為每個 phase-product 組合建立系列，同 phase 內的 product 使用不同顏色
  //   ["1", "2"].forEach((phase) => {
  //     allProducts.forEach((product) => {
  //       const baseColor = productColors.get(product);

  //       // Phase 1 使用基礎顏色，Phase 2 使用較暗的變體
  //       const color =
  //         phase === "1"
  //           ? baseColor
  //           : baseColor === "#4CAF50"
  //           ? "#2E7D32"
  //           : baseColor === "#2196F3"
  //           ? "#1565C0"
  //           : baseColor === "#FF9800"
  //           ? "#E65100"
  //           : baseColor === "#E91E63"
  //           ? "#AD1457"
  //           : baseColor === "#9C27B0"
  //           ? "#6A1B99"
  //           : baseColor === "#00BCD4"
  //           ? "#00838F"
  //           : baseColor === "#795548"
  //           ? "#5D4037"
  //           : "#455A64";

  //       const seriesConfig = {
  //         dataKey: `phase${phase}_${product}`,
  //         label: `Phase ${phase} - ${product}`,
  //         color: color,
  //         stack: `phase${phase}`, // 同 phase 內的所有產品堆疊在一起
  //       };

  //       series.push(seriesConfig);
  //     });
  //   });

  //   // 只在最後一個系列上顯示標籤
  //   return series.map((serie, index) => ({
  //     ...serie,
  //     barLabel: index === series.length - 1 ? "value" : null,
  //   }));
  // }, [statistics]);

  // 取得模型健康度
  const getModelHealthCondition = useCallback(async () => {
    try {
      const health = await ImageService.getHealthCondition();
      if (health.data.sucess) {
        // console.log(health);
        setHealthCondition(health.data.msg);
      }

      return health;
    } catch (error) {
      console.log(error);
    }
  }, []);

  const value = {
    // 常數 Object
    transDefect,
    labeledDefect,
    healthCondition,
    // 狀態
    dateRange,
    dashboardData,
    statistics,
    loading,
    error,

    // 動作
    updateDateRange,
    refreshData,
    clearError,

    // 計算屬性
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
    // 工具函數
    formatDate,
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export default DashboardContext;
