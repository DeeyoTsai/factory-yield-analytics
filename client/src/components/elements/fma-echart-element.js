import React, { useEffect, useState } from "react";
// import ReactEcharts from "echarts-for-react";
// import the core library.
import ReactEChartsCore from "echarts-for-react/lib/core";
// Import the echarts core module, which provides the necessary interfaces for using echarts.
import * as echarts from "echarts/core";
// Import charts, all with Chart suffix
import {
  LineChart,
  BarChart,
  // PieChart,
  // ScatterChart,
  // RadarChart,
  // MapChart,
  // TreeChart,
  // TreemapChart,
  // GraphChart,
  // GaugeChart,
  // FunnelChart,
  // ParallelChart,
  // SankeyChart,
  // BoxplotChart,
  // CandlestickChart,
  // EffectScatterChart,
  //   LinesChart,
  // HeatmapChart,
  // PictorialBarChart,
  // ThemeRiverChart,
  // SunburstChart,
  // CustomChart,
} from "echarts/charts";
// import components, all suffixed with Component
import {
  // GridSimpleComponent,
  GridComponent,
  // PolarComponent,
  // RadarComponent,
  // GeoComponent,
  // SingleAxisComponent,
  // ParallelComponent,
  // CalendarComponent,
  // GraphicComponent,
  ToolboxComponent,
  TooltipComponent,
  // AxisPointerComponent,
  // BrushComponent,
  TitleComponent,
  // TimelineComponent,
  // MarkPointComponent,
  // MarkLineComponent,
  // MarkAreaComponent,
  LegendComponent,
  // LegendScrollComponent,
  // LegendPlainComponent,
  // DataZoomComponent,
  // DataZoomInsideComponent,
  // DataZoomSliderComponent,
  // VisualMapComponent,
  // VisualMapContinuousComponent,
  // VisualMapPiecewiseComponent,
  // AriaComponent,
  // TransformComponent,
  //   DatasetComponent,
} from "echarts/components";
// Import renderer, note that introducing the CanvasRenderer or SVGRenderer is a required step
import { UniversalTransition } from "echarts/features";
import {
  CanvasRenderer,
  // SVGRenderer,
} from "echarts/renderers";

echarts.use([
  TitleComponent,
  ToolboxComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  BarChart,
  LineChart,
  CanvasRenderer,
  UniversalTransition,
]);

/**
 * 依 avg num 遞減排序，並砍掉尾端為 0 的項目。
 *
 * ⚠️ **一定要在複本上操作**：`dfAvgForBar` / `dfRatioForLine` 是
 * `fma-table-element` 的 `stats.avgs` / `stats.ratios` 同一個陣列參考。
 * 舊版直接 `.sort()` / `.splice()` props，會把表尾的「Avg Num」「百分比(%)」
 * 兩列就地改成排序後、被截短的陣列 —— 表尾欄數跟上面的 defect 欄對不起來。
 *
 * @returns {{labels: string[], avgs: number[], ratios: number[]}} 三者索引一一對應
 */
function computeSorted(dfAvgForBar, dfRatioForLine, defectArr) {
  const len = dfAvgForBar.length;
  let indexArr = Array.from({ length: len }, (_, i) => i);
  // 從大到小排序 avg num，存 index 至 indexArr
  indexArr.sort((a, b) =>
    dfAvgForBar[a] > dfAvgForBar[b] ? -1 : dfAvgForBar[a] < dfAvgForBar[b] ? 1 : 0
  );
  // 複本遞減排序（avg 與 ratio 都是 total 的單調函數，各自排序後配對一致）
  let avgs = [...dfAvgForBar].sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
  let ratios = [...dfRatioForLine].sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));

  // 移除 avg 為 0 的項目（全部為 0 時不截斷，維持舊行為）
  const zeroStart = avgs.findIndex((e) => e === 0);
  if (zeroStart > 0) {
    indexArr = indexArr.slice(0, zeroStart);
    avgs = avgs.slice(0, zeroStart);
    ratios = ratios.slice(0, zeroStart);
  }
  return { labels: indexArr.map((e) => defectArr[e]), avgs, ratios };
}

const FmaEchartElement = (props) => {
  // defectArr（來自 FmaContext）已是 12 類中文顯示名，直接使用即可，
  // 不再需要舊版「英文欄位名 → 中文」對照表。
  const [chart, setChart] = useState({ labels: [], avgs: [], ratios: [] });
  const maxAvg = chart.avgs.length ? Math.max(...chart.avgs) : 1;
  const maxRatio = chart.ratios.length ? Math.max(...chart.ratios) : 0.01;
  let option = {
    title: {
      text: props.product,
      textStyle: {
        lineHeight: 9,
      },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "cross",
        crossStyle: {
          color: "#999",
        },
      },
    },
    toolbox: {
      feature: {
        dataView: { show: true, readOnly: false },
        magicType: { show: true, type: ["line", "bar"] },
        restore: { show: true },
        saveAsImage: { show: true },
      },
    },
    legend: {
      data: ["平均顆數\n(Avg. Num)", "百分比(%)"],
    },
    xAxis: [
      {
        type: "category",
        data: chart.labels,
        axisPointer: {
          type: "shadow",
        },
        axisLabel: {
          rotate: 20,
        },
        name: "Defect Type",
        nameLocation: "middle",
        nameTextStyle: {
          fontWeight: "bold",
          fontSize: 18,
          align: "center",
          verticalAlign: "top",
          lineHeight: 80,
        },
      },
    ],
    yAxis: [
      {
        type: "value",
        // name: "Precipitation",
        name: "平均顆數(Avg. Num)",
        nameTextStyle: {
          lineHeight: 10,
          verticalAlign: "bottom",
        },
        min: 0,
        max: Math.ceil(maxAvg),
        interval: Math.ceil(maxAvg) / 5,
        axisLabel: {
          formatter: "{value} ",
        },
      },
      {
        type: "value",
        name: "百分比(%)",
        min: 0,
        max: Math.ceil(maxRatio * 100),
        interval: Math.ceil(maxRatio * 100) / 5,
        axisLabel: {
          formatter: "{value} %",
        },
      },
    ],
    series: [
      {
        name: "平均顆數\n(Avg. Num)",
        type: "bar",
        tooltip: {
          valueFormatter: function (value) {
            return value.toFixed(1) + " cnt";
          },
        },
        data: chart.avgs,
      },

      {
        name: "百分比(%)",
        type: "line",
        yAxisIndex: 1,
        tooltip: {
          valueFormatter: function (value) {
            return value + " %";
          },
        },
        data: chart.ratios.map((e) => (e * 100).toFixed(1)),
      },
    ],
  };

  const { setSortedDfArr, setSortedRatios } = props;
  useEffect(() => {
    const avg = props.dfAvgForBar || [];
    const ratio = props.dfRatioForLine || [];
    if (avg.length === 0) return;
    const next = computeSorted(avg, ratio, props.defectArr || []);
    setChart(next);
    // 排序後的結果另外往上送：outline 前三大 defect 與對策文字都要「跟 labels 對得起來」
    // 的 ratio，不能再靠竄改 props 取得。
    if (next.avgs[0] !== 0) {
      setSortedDfArr?.(next.labels);
      setSortedRatios?.(next.ratios);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.dfAvgForBar, props.dfRatioForLine, props.defectArr]);

  return (
    <div>
      <h4 className="card-title text-center fw-bold">FMA Chart</h4>
      <ReactEChartsCore
        echarts={echarts}
        option={option}
        notMerge={true}
        lazyUpdate={true}
        // theme={"theme_name"}
        // onChartReady={this.onChartReadyCallback}
        // onEvents={EventsDict}
        // opts={option}
      />
    </div>
  );
};

export default FmaEchartElement;
