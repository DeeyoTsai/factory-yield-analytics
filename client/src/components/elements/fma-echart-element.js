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

const FmaEchartElement = (props) => {
  const transDefect = {
    runder: "R異物",
    gunder: "G異物",
    bunder: "B異物",
    bmwp: "BM WP",
    rwp: "R WP",
    gwp: "G WP",
    bwp: "B WP",
    rgel: "R殘膠",
    ggel: "G殘膠",
    bgel: "B殘膠",
    rresistsmall: "R微小異物",
    gresistsmall: "G微小異物",
    bresistsmall: "B微小異物",
    rfiber: "R纖維",
    gfiber: "G纖維",
    bfiber: "B纖維",
    bp: "BP",
    bmdirty: "BM髒污",
    repair: "修正痕",
    abovep: "膜厚異常",
    backdirty: "背汙",
    dirty: "髒污",
    ovendrop: "氣泡",
    black: "黑色系",
  };

  let [dfArr, setDfArr] = useState([]);
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
        data: dfArr,
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
        // min: Math.floor(Math.min(...props.dfAvgForBar)),
        min: 0,
        max: Math.ceil(Math.max(...props.dfAvgForBar)),
        interval: Math.ceil(Math.max(...props.dfAvgForBar)) / 5,
        axisLabel: {
          formatter: "{value} ",
        },
      },
      {
        type: "value",
        name: "百分比(%)",
        min: 0,
        max: Math.ceil(Math.max(...props.dfRatioForLine) * 100),
        interval: Math.ceil(Math.max(...props.dfRatioForLine) * 100) / 5,
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
        // data: [
        //   2.0, 4.9, 7.0, 23.2, 25.6, 76.7, 135.6, 162.2, 32.6, 20.0, 6.4, 3.3,
        // ],
        data: props.dfAvgForBar,
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
        // data: [
        //   2.0, 2.2, 3.3, 4.5, 6.3, 10.2, 20.3, 23.4, 23.0, 16.5, 12.0, 6.2,
        // ],
        data: props.dfRatioForLine.map((e) => (e * 100).toFixed(1)),
      },
    ],
  };

  function sortDefect(dfAvgForBar, dfRatioForLine) {
    const len = dfAvgForBar.length;
    let indexArr = [];
    for (let i = 0; i < len; i++) {
      indexArr[i] = i;
    }
    // 從大到小排序avg num，存入index至indexArr
    indexArr.sort((a, b) => {
      return dfAvgForBar[a] > dfAvgForBar[b]
        ? -1
        : dfAvgForBar[a] < dfAvgForBar[b]
        ? 1
        : 0;
    });
    // dfAvgForBar & dfRatioForLine遞減排序
    dfAvgForBar.sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));
    dfRatioForLine.sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));

    let zeroStart = -1;

    // 移除dfAvgForBar中數值為0的elements
    zeroStart = dfAvgForBar.findIndex((e) => e === 0);
    if (zeroStart > 0) {
      indexArr.splice(zeroStart, len - zeroStart);
      dfAvgForBar.splice(zeroStart, len - zeroStart);
      dfRatioForLine.splice(zeroStart, len - zeroStart);
    }
    // 將indexArr轉成defect種類
    let dfArr = [];
    if (indexArr.length > 0) {
      indexArr.map((e, i) => {
        dfArr[i] = transDefect[props.defectArr[e]?.replaceAll("-", "")]
          ? transDefect[props.defectArr[e]?.replaceAll("-", "")]
          : props.defectArr[e];
      });
    }
    if (dfAvgForBar[0] !== 0) {
      props.setSortedDfArr(dfArr);
    }

    return dfArr;
  }

  useEffect(() => {
    if (props.dfAvgForBar.length > 0 || props.dfRatioForLine) {
      setDfArr(sortDefect(props.dfAvgForBar, props.dfRatioForLine));
    }
  }, [props.dfAvgForBar, props.dfRatioForLine]);

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
