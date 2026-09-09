import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

// 依全良率排序的水平長條圖：一眼看出良率偏低的品種/lot，長條尾端標主要 defect code
// 單軸設計（X=全良率），顏色為同一數值的連續漸層編碼，不另開第二數值軸
const UnfinishLotOverviewChart = ({ lots, onSelectLot }) => {
  const rows = useMemo(() => {
    return [...lots]
      .map((l) => {
        const defects = [...(l.defects || [])].sort((a, b) => b.qty - a.qty);
        return { ...l, topDefects: defects.slice(0, 3) };
      })
      .sort((a, b) => a.yield_rate - b.yield_rate); // 升冪：最差排最前面
  }, [lots]);

  // 顏色量級範圍以實際資料下限為準（良率通常集中在 85~100%，用固定 0~100 會讓漸層幾乎看不出差異）
  const minYield = rows.length ? Math.min(...rows.map((r) => r.yield_rate)) : 0;
  const visualMapMin = Math.max(0, Math.floor(minYield) - 2);

  const option = useMemo(() => ({
    tooltip: {
      trigger: 'item',
      formatter: (p) => {
        const r = rows[p.dataIndex];
        if (!r) return '';
        const defectLines = r.topDefects.length
          ? r.topDefects.map((d) => `${d.defectcode}（${d.qty}）`).join('<br/>')
          : '無 defect 資料';
        return [
          `<b>${r.lotno}｜${r.product}</b>`,
          `全良率：${r.yield_rate}%`,
          `總計／投入：${r.total} ／ ${r.input_qty}`,
          `主要 defect：<br/>${defectLines}`,
        ].join('<br/>');
      },
    },
    grid: { left: 300, right: 250, top: 10, bottom: 30 },
    xAxis: { type: 'value', name: '全良率(%)', min: 0, max: 100, nameLocation:'middle', nameGap:16 },
    yAxis: {
      type: 'category',
      inverse: true, // 升冪排序後 index 0 是最差，inverse 讓它顯示在最上方
      data: rows.map((r) => `${r.product}｜${r.lotno}`),
      axisLabel: { fontSize: 11 },
    },
    visualMap: {
      show: false,
      min: visualMapMin,
      max: 100,
      dimension: 0,
      seriesIndex: 0, // 只上色主 series，避免覆蓋下面透明的數值標籤 series
      // 單一色相（紅）由深至淺：良率越低顏色越深/越搶眼，良率越高顏色越淺（sequential 量級編碼，非二色 diverging）
      inRange: { color: ['#7f1d1d', '#fecaca'] },
    },
    series: [
      {
        type: 'bar',
        data: rows.map((r) => r.yield_rate),
        barMaxWidth: 22,
        label: {
          show: true,
          position: 'right',
          formatter: (p) => {
            const r = rows[p.dataIndex];
            const top = r?.topDefects?.[0];
            return top ? `${top.defectcode}（${top.qty}）` : '';
          },
          fontSize: 11,
          color: '#475569',
        },
      },
      {
        // 全良率數值標籤層：透明長條完全重疊主 series（barGap -100%），只負責在長條中間顯示數值
        // silent: true 讓滑鼠事件穿透到主 series，不影響點擊選 lot
        type: 'bar',
        barGap: '-100%',
        silent: true,
        barMaxWidth: 22,
        itemStyle: { color: 'transparent' },
        data: rows.map((r) => r.yield_rate),
        label: {
          show: true,
          position: 'inside',
          formatter: (p) => `${rows[p.dataIndex]?.yield_rate}%`,
          fontSize: 11,
          fontWeight: 'bold',
          color: '#1e293b',
          textBorderColor: '#ffffff',
          textBorderWidth: 2,
        },
      },
    ],
  }), [rows, visualMapMin]);

  return (
    <ReactECharts
      option={option}
      style={{ height: Math.max(rows.length * 32, 120), width: '100%' }}
      notMerge
      onEvents={{ click: (p) => { const r = rows[p.dataIndex]; if (r) onSelectLot(r); } }}
    />
  );
};

export default UnfinishLotOverviewChart;
