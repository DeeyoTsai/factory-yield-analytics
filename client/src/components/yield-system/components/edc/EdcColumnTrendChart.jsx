import React, { useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';

const SHOT_COLUMN_RE = /^Shot(\d+)_Final_(.+)$/;
// Shot 檢視模式固定顯示這 8 個角點欄位，依此順序排列（不含 Align_T）
const SHOT_FIELD_ORDER = ['FRX', 'FRY', 'FLX', 'FLY', 'RLX', 'RLY', 'RRX', 'RRY'];
const SHOT_NUMBERS = [1, 2, 3, 4, 5, 6];

// 依 Shot 編號排序，同 Shot 內再依欄位名排序
function sortColumns(columns) {
  return [...columns].sort((a, b) => {
    const ma = a.match(SHOT_COLUMN_RE);
    const mb = b.match(SHOT_COLUMN_RE);
    const sa = ma ? Number(ma[1]) : 0;
    const sb = mb ? Number(mb[1]) : 0;
    return sa - sb || a.localeCompare(b);
  });
}

const fmt = (v) => (Number.isFinite(v) ? v.toFixed(2) : '-');

// 單一欄位的折線點狀圖：把該欄位「逐段」序列攤平在同一條 x 軸，
//  - 每段各畫一條折線（段與段之間不連，避免跨基準線誤導）
//  - 段與段之間畫黑色虛線分隔
//  - 每段各自的 OOS 帶（中位數 ± threshold，紅色虛線，只橫跨該段 x 範圍）
//  - 每段的 max/min/avg 直接標在該段上方空白區
//  - 離群基板紅點放大
function buildOption(column, segData, threshold, outlierGlassIds) {
  // 攤平所有段的點，記錄每段在 x 軸的 [start, end) 區間
  const allPoints = [];
  const segRanges = [];
  for (const seg of segData) {
    const start = allPoints.length;
    for (const p of (seg.points || [])) allPoints.push(p);
    segRanges.push({ start, end: allPoints.length, seg });
  }
  // 找出每個點所屬的分段（用來跟該段自己的中位數±threshold 比對）
  const segOfIndex = (i) => segRanges.find(({ start, end }) => i >= start && i < end)?.seg;
  // 「超出管制線」＝該點的值超出所屬分段的 OOS 上下限（中位數 ± threshold），不限於演算法挑出的兇手枚
  const isOutOfControl = (i) => {
    const seg = segOfIndex(i);
    const p = allPoints[i];
    if (!seg || !p || !Number.isFinite(seg.median)) return false;
    return Math.abs(p.value - seg.median) > threshold;
  };
  const isOutlier = (i) => isOutOfControl(i) || outlierGlassIds.has(allPoints[i]?.glass_id);

  // y 軸範圍要涵蓋「所有點 + 每段的中位數±threshold」，兩條 OOS 線才不會被切掉（之前少一條就是被 axis 裁掉）
  const ys = allPoints.map((p) => p.value);
  for (const { seg } of segRanges) {
    if (Number.isFinite(seg.median)) ys.push(seg.median + threshold, seg.median - threshold);
  }
  const yLo = Math.min(...ys);
  const yHi = Math.max(...ys);
  const pad = (yHi - yLo) * 0.12 || 1;

  // 每段一條折線（用 null 讓段之間斷開）——資料量大時點會擠在一起，離群標示改用獨立的頂層 scatter series（見下）
  const lineSeries = segRanges.map(({ start, end }) => ({
    type: 'line',
    data: allPoints.map((p, i) => (i >= start && i < end ? p.value : null)),
    connectNulls: false,
    showSymbol: true,
    symbol: 'circle',
    symbolSize: 4,
    itemStyle: { color: '#3b82f6' },
    lineStyle: { color: '#93c5fd', width: 1 },
    z: 3,
  }));

  // 離群點獨立畫成頂層 scatter（z 最高、最後畫），避免資料點太密（單段近700枚）時被其他點蓋住看不到
  const outlierSeries = {
    type: 'scatter',
    data: allPoints.map((p, i) => (isOutlier(i) ? p.value : null)),
    symbolSize: 14,
    itemStyle: { color: '#dc2626', borderColor: '#000', borderWidth: 2 },
    z: 10,
  };

  // 標註層（markLine 段界+OOS帶+中位數、markPoint 逐段 max/min/avg），掛在一條空 series 上
  const markLineData = [];
  segRanges.forEach(({ start, end, seg }, i) => {
    if (i > 0) {
      // 段界黑色虛線（畫在該段第一點的 x 位置）
      markLineData.push({ xAxis: start, lineStyle: { color: '#111', type: 'dashed', width: 1.2 } });
    }
    const last = end - 1;
    if (Number.isFinite(seg.median)) {
      // 中心線（灰，中位數）：標籤放線中間，左右兩側都容易被其他文字/邊界擠到
      markLineData.push([
        { coord: [start, seg.median] },
        {
          coord: [last, seg.median],
          label: { show: true, position: 'middle', fontSize: 8, color: '#6b7280', formatter: () => `中位數 ${fmt(seg.median)}` },
        },
      ]);
      // 管制上下限（UCL=中位數+T、LCL=中位數−T，門檻 T 由後端提供不寫死）：不常駐顯示文字，
      // 改成 hover 該紅線時才用 tooltip 顯示計算公式＋數值（desc 供下方 tooltip formatter 讀取）
      markLineData.push([
        {
          coord: [start, seg.median + threshold],
          lineStyle: { color: '#dc2626', type: 'dashed' },
          desc: `UCL＝中位數＋T ＝ ${fmt(seg.median + threshold)}`,
        },
        { coord: [last, seg.median + threshold], lineStyle: { color: '#dc2626', type: 'dashed' } },
      ]);
      markLineData.push([
        {
          coord: [start, seg.median - threshold],
          lineStyle: { color: '#dc2626', type: 'dashed' },
          desc: `LCL＝中位數－T ＝ ${fmt(seg.median - threshold)}`,
        },
        { coord: [last, seg.median - threshold], lineStyle: { color: '#dc2626', type: 'dashed' } },
      ]);
    }
  });

  // 逐段 max/min/avg 標在該段上方空白區（x 取該段中點，y 取上緣）——品種名不重複標在這裡，
  // 因為第2層 header 跟第1層彙總表已經依品種分組顯示過，chart 上再標一次是多餘的
  const markPointData = segRanges.map(({ start, end, seg }) => ({
    coord: [Math.floor((start + end - 1) / 2), yHi + pad * 0.4],
    value: `Max ${fmt(seg.max)}\nMin ${fmt(seg.min)}\nAvg ${fmt(seg.avg)}`,
  }));

  const annotationSeries = {
    type: 'line',
    data: [],
    markLine: {
      silent: false, // 管制線需要能 hover 觸發 tooltip（顯示 UCL/LCL 計算公式），故不能是 silent
      symbol: 'none',
      lineStyle: { color: '#9ca3af', width: 1 },
      label: { show: false },
      data: markLineData,
    },
    markPoint: {
      silent: true,
      symbol: 'rect',
      symbolSize: 0.1,
      label: {
        show: true,
        formatter: (p) => p.data.value,
        fontSize: 9,
        color: '#334155',
        lineHeight: 12,
        backgroundColor: 'rgba(255,255,255,0.6)',
        padding: [1, 3],
      },
      data: markPointData,
    },
  };

  return {
    title: { text: column, textStyle: { fontSize: 10, fontWeight: 'normal' }, top: 2, left: 4 },
    tooltip: {
      trigger: 'item',
      formatter: (p) => {
        if (p.componentType === 'markLine') {
          const point = Array.isArray(p.data) ? p.data[0] : p.data;
          return point?.desc || '';
        }
        const row = allPoints[p.dataIndex];
        if (!row) return '';
        const tag = isOutlier(p.dataIndex) ? '（超出管制線）' : '';
        return `${row.glass_id}${tag}<br/>${row.event_datetime}<br/>值：${row.value}`;
      },
    },
    grid: { left: 34, right: 8, top: 30, bottom: 30 },
    xAxis: { type: 'category', data: allPoints.map((_, i) => i), show: false },
    yAxis: { type: 'value', min: yLo - pad, max: yHi + pad * 1.6, axisLabel: { fontSize: 9 } },
    // 資料量大時 showAllSymbol:'auto' 只畫得下少數藍點（折線與 hover 仍是完整的）。
    // 加 dataZoom 讓使用者放大某區段時被藏的點自動浮現。filterMode:'none'＝只縮視窗、
    // 不抽掉資料，markLine/markPoint 用的 category index 座標才不會位移。
    dataZoom: [
      { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
      { type: 'slider', xAxisIndex: 0, filterMode: 'none', height: 16, bottom: 6, start: 0, end: 100 },
    ],
    series: [...lineSeries, annotationSeries, outlierSeries],
  };
}

// 折線點狀圖網格：下拉選單切兩種檢視——
//  ①「全距>=4 異常 charts」：只列該站別品種有超規格紀錄的欄位（byColumn 的 overSpec===true），依 Shot 排序
//  ② Shot 1~6：固定列出該 Shot 的 8 張角點 chart（FRX/FRY/FLX/FLY/RLX/RLY/RRX/RRY），不論是否超規格；
//     若該欄位這批資料沒監控到（例如該 Shot 未曝光），顯示無資料佔位卡
//
// ── props 的來源與內容 ────────────────────────────────────────────────────────
// 兩個都不是單一資料表，是後端 edcController.getGroupFlagged()（GET /api/edc/group/flagged）
// 現組出來的，父層 EdcRangeView 收到後原封不動往下傳。
//
// byColumn：物件，key＝監控欄位名 `Shot{n}_Final_{FRX|FRY|FLX|FLY|RLX|RLY|RRX|RRY}`
//   （只有「這批實際有非零值」的欄位會出現）。value 的形狀：
//     {
//       overSpec: boolean,        // 任一段全距 >= rangeSpec(4)
//       groupMaxRange: number,    // 各段全距的最大值（圖下方那個粗體數字）
//       segments: [{
//         segment_index, boundary_reason('start'|'recipe'|'relogin'), recipe,
//         min, max, avg, median, range,   // ← edc_segments.stats[欄位]（JSON 欄，一段一列）
//         overSpec,                        // 該段 range >= 4
//         points: [{ glass_id, event_datetime, value }]  // ← edc_glass_records，一片 glass 一列一點
//       }]
//     }
//   相關資料表：
//     - edc_segments（model EdcSegment）：分段統計，stats 是 { [欄位]:{min,max,avg,median,range} }
//     - edc_glass_records（model EdcGlassRecord）：每片 glass 的原始量測值，欄位名與 EDC 原始欄名
//       一字不差（Shot3_Final_FRY…），逐片落地成真欄位而非 JSON 陣列
//   兩張表都由 ingestion adapter 每次整批 destroy-CASCADE 重建（見 domain/edcStore.js）。
//
// flaggedGlass：陣列，段內離群邏輯挑出的「兇手基板」，一片一列。每個元素：
//     {
//       id, edc_segment_id,
//       glass_id, event_datetime, station, machine, recipe,
//       column_name,      // 這片在哪一欄離群（例 Shot3_Final_RRY）
//       value,            // 那一格的量測值
//       segment_median, segment_range,   // 所屬分段的中位數 / 全距
//       side,             // 'max'（偏上緣）/ 'min'（偏下緣）
//       confirmed, comment   // ← 人工欄位，left-join edc_glass_comment 補上（見下）
//     }
//   相關資料表：
//     - edc_flagged_glass（model EdcFlaggedGlass）：離群兇手明細，ingestion adapter 整批重建
//     - edc_glass_comment（model EdcGlassComment）：user 的確認/註解，自然鍵
//       (day,station,machine,glass_id,column_name)，**匯入流程永不觸碰**，重新匯入不會洗掉
//   本元件只用它篩出「這一欄」的 glass_id 集合 → buildOption 把這些點畫成放大紅點；
//   同一份 flaggedGlass 也給下方 EdcFlaggedGlassTable 當可勾選確認的清單。
//
// threshold：單一數字，後端 DEFAULT_CONFIG.outlierThreshold（預設 2），非資料表。
//   用途：畫每段管制上下限線 = 中位數 ± threshold。
// ─────────────────────────────────────────────────────────────────────────────
const EdcColumnTrendChart = ({ byColumn = {}, flaggedGlass = [], threshold = 2 }) => {
  const [mode, setMode] = useState('flagged'); // 'flagged' | 1~6

  const columns = useMemo(() => {
    if (mode === 'flagged') {
      return sortColumns(Object.keys(byColumn).filter((col) => byColumn[col]?.overSpec));
    }
    return SHOT_FIELD_ORDER.map((field) => `Shot${mode}_Final_${field}`);
  }, [byColumn, mode]);

  // ⚠️ 一定要 memo：buildOption 內含多個 inline formatter 函式，每次呼叫都是新參考。
  // echarts-for-react 以 deep-equal 比對 option（函式比參考、必不相等），不 memo 的話
  // 父層 EdcRangeView 每 4 秒輪詢爬蟲狀態觸發的 re-render 都會被判定成「option 變了」→
  // 重新 setOption(notMerge) → 使用者拉的 dataZoom 範圍被重置、畫面每 4 秒閃一次。
  // 資料（byColumn/flaggedGlass/threshold/columns）沒變時，option 參考不變 → echarts 不重繪。
  const optionByColumn = useMemo(() => {
    const map = {};
    for (const col of columns) {
      const info = byColumn[col];
      if (!info) continue;
      const outlierGlassIds = new Set(
        flaggedGlass.filter((f) => f.column_name === col).map((f) => f.glass_id)
      );
      map[col] = buildOption(col, info.segments || [], threshold, outlierGlassIds);
    }
    return map;
  }, [columns, byColumn, flaggedGlass, threshold]);

  return (
    <div>
      <div className="d-flex justify-content-end mb-2">
        <select
          className="form-select form-select-sm"
          style={{ width: 'auto' }}
          value={mode}
          onChange={(e) => setMode(e.target.value === 'flagged' ? 'flagged' : Number(e.target.value))}
        >
          <option value="flagged">全距&gt;=4 異常 charts</option>
          {SHOT_NUMBERS.map((n) => (
            <option key={n} value={n}>{`Shot ${n}`}</option>
          ))}
        </select>
      </div>

      {mode === 'flagged' && !columns.length ? (
        <p className="text-center text-muted py-4 mb-0">此群組無超規格欄位</p>
      ) : (
        <div className="row g-2">
          {columns.map((col) => {
            const info = byColumn[col];
            if (!info) {
              return (
                <div key={col} className="col-12 col-md-6">
                  <div
                    className="border rounded p-1 d-flex align-items-center justify-content-center text-muted"
                    style={{ height: 260, fontSize: 11 }}
                  >
                    {col}：無資料
                  </div>
                </div>
              );
            }
            const option = optionByColumn[col];
            return (
              <div key={col} className="col-12 col-md-6">
                <div className="border rounded p-1">
                  <ReactECharts option={option} style={{ height: 260 }} notMerge />
                  {/* 這是整張圖最該一眼看到的數字（判斷該欄位有沒有超規格），原本 10px 灰字太不起眼 */}
                  <div className="text-center" style={{ fontSize: 15, fontWeight: 700 }}>
                    <span className="text-muted" style={{ fontSize: 12, fontWeight: 600 }}>群組最大全距 </span>
                    {fmt(info.groupMaxRange)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EdcColumnTrendChart;
