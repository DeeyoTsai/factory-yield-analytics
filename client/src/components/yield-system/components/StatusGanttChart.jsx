import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import dayjs from 'dayjs';
import { Box } from '@mui/material';
import StatusHeatTable from './StatusHeatTable';

const STATUS_COLORS = {
  'FAC': '#4CAF50',
  'INIT': '#2196F3',
  'DOWN': '#e83327',
  'IDLE': '#FF9800',
  'ENG': '#9C27B0',
  '調整': '#00BCD4',
  'PM': '#607D8B',
  'MIT': '#c00644',
  'MFG': '#7f402a',
  'HOLD': '#f77f5a',
};

const FALLBACK_COLORS = [
  '#26A69A','#66BB6A','#FFA726','#EC407A','#AB47BC',
  '#42A5F5','#26C6DA','#D4E157','#8D6E63','#78909C',
];

function getStatusColor(status) {
  if (STATUS_COLORS[status]) return STATUS_COLORS[status];
  // 用 status 字串 hash 決定 fallback 顏色，確保同一 status 每次同色
  let hash = 0;
  for (let i = 0; i < status.length; i++) hash += status.charCodeAt(i);
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

const StatusGanttChart = ({ data: eqData, date }) => {

  const timeRange = useMemo(() => {
    if (!date) return {};
    const dt = dayjs(date);
    return {
      min: dt.subtract(1, 'day').hour(6).minute(0).second(0).valueOf(),
      max: dt.hour(10).minute(0).second(0).valueOf(),
    };
  }, [date]);

  const ganttOption = useMemo(() => {
    if (!eqData || eqData.length === 0) return {};
    // console.log(eqData);
    
    const chartData = eqData
      .filter(v => v.begintime && v.endtime)
      .map(v => {
        const startMs = dayjs(v.begintime).valueOf();
        const endMs = dayjs(v.endtime).valueOf();
        const hours = +((endMs - startMs) / 3600000).toFixed(2);
        return {
          name: String(v.id),
          // value: [line, startMs, endMs, hours, status, code, product, lot, handler, action]
          value: [v.line, startMs, endMs, hours, v.status, v.code, v.product, v.lot, v.handler, v.action],
          itemStyle: { color: getStatusColor(v.status) },
        };
      });

    const uniqueStatuses = [...new Set(eqData.map(v => v.status).filter(Boolean))];
    const truncate = (text, maxLength = 100) => {
      return text.length > maxLength ? text.substring(0, maxLength) + '<br />' +text.substring(maxLength, text.length) : text;
    };

    return {
      title: { text: '機況甘特圖', left: 'center' },
      legend: {
        type: 'scroll',
        top: 28,
        data: uniqueStatuses.map(s => ({
          name: s,
          icon: 'rect',
          itemStyle: { color: getStatusColor(s) },
        })),
      },

      tooltip: {
        show: true,
        enteraable:true, // 允許滑鼠進入 tooltip 浮層中（若需要點擊連結或捲動時必設）
        confine: true,  // 防止 tooltip 超出容器
        extraCssText: 'max-width: 600px; white-space: pre-wrap; word-wrap: break-word; overflow: auto;', // 限制寬度並允許斷行
        alwaysShowContent: false,
        formatter: (params) => {
          const v = params.value;
          return [
            `Line: ${v[0]}`,
            `Code: ${v[5]}`,
            `Status: ${v[4]}`,
            `Product: ${v[6]}`,
            `LOT: ${v[7]}`,
            `處理人員: ${v[8]}`,
            `處置內容: ${v[9]}。`,
            `開始時間: ${dayjs(v[1]).format('MM/DD HH:mm')}`,
            `結束時間: ${dayjs(v[2]).format('MM/DD HH:mm')}`,
            `耗時: ${v[3]} 小時`,
          ].join('<br/>');
        },
      },
      grid: { top: 90, height: 450, bottom: 100 },
      dataZoom: [
        { type: 'slider', filterMode: 'weakFilter', showDataShadow: false, bottom: 20 },
        { type: 'inside', filterMode: 'weakFilter' },
      ],
      xAxis: {
        type: 'time',
        name: '時間',
        nameLocation: 'end',
        min: timeRange.min,
        max: timeRange.max,
        axisLabel: {
          rotate: 45,
          formatter: (val) => dayjs(val).format('MM/DD HH:mm'),
        },
      },
      yAxis: {
        data: ['L6', 'L5', 'L4', 'L3', 'L2', 'L1'],
        name: 'Line',
        axisLabel: { fontSize: 14 },
        splitLine: {              // ← 加橫向格線
          show: true,
          lineStyle: {
            color: '#b5b4b4',        // 格線顏色
            width: 1,             // 格線寬度
            type: 'solid',        // 線條樣式
          }
  }        
      },
      series: [{
        type: 'custom',
        renderItem: (params, api) => {
          const categoryIndex = api.value(0);
          const start = api.coord([api.value(1), categoryIndex]);
          const end = api.coord([api.value(2), categoryIndex]);
          const height = api.size([0, 1])[1] * 0.6;
          const rectShape = echarts.graphic.clipRectByRect(
            { x: start[0], y: start[1] - height / 2, width: end[0] - start[0], height },
            { x: params.coordSys.x, y: params.coordSys.y, width: params.coordSys.width, height: params.coordSys.height }
          );
          return rectShape && { type: 'rect', shape: rectShape, style: api.style() };
        },
        label: {
          show: true,
          position: 'inside',
          formatter: (params) => params.value[3] ?? '',
          itemStyle:{},
          fontSize: 11,
          color: '#404040',
        },
        itemStyle: { opacity: 0.85, borderColor: '#5a4c4c', borderWidth: 1 },
        encode: { x: [1, 2], y: 0 },
        data: chartData,
      },
      // 空 scatter series：讓 legend 可點擊（ECharts custom series 不自動掛 legend）
      ...uniqueStatuses.map(s => ({
        type: 'scatter',
        name: s,
        data: [],
        itemStyle: { color: getStatusColor(s) },
        legendHoverLink: false,
      })),
    ],
    };
  }, [eqData, timeRange]);

  const LINES = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];

  const lineDonutOptions = useMemo(() => {
    return LINES.map((lineId) => {
      const lineData = (eqData || []).filter(v => v.line === lineId && v.begintime && v.endtime);
      const statusMap = lineData.reduce((acc, v) => {
        const hours = (dayjs(v.endtime).valueOf() - dayjs(v.begintime).valueOf()) / 3600000;
        acc[v.status] = (acc[v.status] || 0) + hours;
        return acc;
      }, {});
      const pieData = Object.entries(statusMap)
        .map(([name, val]) => ({ name, value: +val.toFixed(2) }))
        .sort((a, b) => b.value - a.value);

      return {
        title: {
          text: lineId,
          left: 'center',
          top: '38%',
          textStyle: { fontSize: 15, fontWeight: 'bold', color: '#444' },
        },
        tooltip: { formatter: '{b}: {c} 小時 ({d}%)' },
        series: [{
          type: 'pie',
          radius: ['35%', '60%'],
          center: ['50%', '50%'],
          data: pieData.length > 0 ? pieData : [{ name: '無資料', value: 1, itemStyle: { color: '#eee' } }],
          itemStyle: { color: (params) => params.name === '無資料' ? '#eee' : getStatusColor(params.name) },
          label: { show: true, formatter: '{b}\n{c}h', fontSize: 11 },
          emphasis: { label: { show: true, fontSize: 13 } },
        }],
      };
    });
  }, [eqData]);

  return (
    <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
      <Box sx={{ flex: '0 0 80%' }}>
        <ReactECharts
          option={ganttOption}
          style={{ height: '650px', width: '100%' }}
          notMerge={true}
        />
      </Box>
      {/* 右側：熱力表格（替換甜甜圈測試版），原甜甜圈保留在下方備用 */}
      <Box sx={{ flex: '0 0 20%', height: '650px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', padding: '4px 8px', background: '#1565c0', color: '#fff', borderRadius: '4px 4px 0 0' }}>
          機況統計（Line × Status）
        </div>
        <Box sx={{ flex: 1, overflow: 'hidden', border: '1px solid #ddd', borderTop: 'none', borderRadius: '0 0 4px 4px' }}>
          <StatusHeatTable data={eqData} />
        </Box>
      </Box>
      {/* 原甜甜圈區塊（保留備用，暫時隱藏）
      <Box sx={{ flex: '0 0 30%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
        {lineDonutOptions.map((opt, idx) => (
          <ReactECharts
            key={LINES[idx]}
            option={opt}
            style={{ height: '215px', width: '100%' }}
            notMerge={true}
          />
        ))}
      </Box>
      */}
    </Box>
  );
};

export default StatusGanttChart;


