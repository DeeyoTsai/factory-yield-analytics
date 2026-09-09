import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

// 未結批 glass 明細的 defect 座標分布圖（data = UnfinishDefectDetail rows）
// 純圖表元件：外框卡片與標題由呼叫端（UnfinishLotView 的 card/card-header）負責
// 軸向設計 follow dashboard/DefectScatterChart：X/Y 皆 inverse + 軸移對側 → 零點在右上角；座標除 1000 顯示；symbolSize 16
const UnfinishDefectMap = ({ details }) => {
  const option = useMemo(() => ({
    tooltip: {
      trigger: 'item',
      formatter: (p) => `ID: ${p.data[2]}<br/>X: ${p.data[0]}, Y: ${p.data[1]}`,
    },
    grid: { left: '10%', right: '10%', top: '3%', bottom: '10%', containLabel: true },
    xAxis: {
      type: 'value', name: 'X', inverse: true, position: 'top', max:1300, min:0, interval:100,
      axisLabel: { align: 'center', fontSize: 12, hideOverlap: true },
      nameTextStyle: { fontSize: 14, align: 'right' },
    },
    yAxis: {
      type: 'value', name: 'Y', inverse: true, position: 'right', max: 1100, min: 0, interval: 100,
      axisLabel: { align: 'left', fontSize: 12, hideOverlap: true },
      nameTextStyle: { fontSize: 14 },
    },
    series: [{
      type: 'scatter',
      symbolSize: 16,
      itemStyle: { borderColor: '#555' },
      data: details.map((r) => [parseFloat(Number(r.x) / 1000).toFixed(2) || 0, parseFloat(Number(r.y) / 1000).toFixed(2) || 0, r.glassid]),
    }],
  }), [details]);

  return <ReactECharts option={option} style={{ height: 450, width: '100%' }} notMerge />;
};

export default UnfinishDefectMap;
