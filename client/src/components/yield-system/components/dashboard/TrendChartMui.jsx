import React, { useState, useEffect, useRef, act } from 'react';
import axios from 'axios';
import {
  ChartContainer,
  BarPlot,
  LinePlot,
  MarkPlot,
  ChartsXAxis,
  ChartsYAxis,
  ChartsGrid,
  ChartsLegend,
  ChartsTooltipContainer,
  useAxesTooltip,
} from '@mui/x-charts';
import { Box, Paper, Typography, Divider, CircularProgress } from '@mui/material';
import { API_BASE_URL } from '../../../../config/api';

// '2026/06/02 08:20:00' → 8.333
const toDecimalHour = (datetimeStr) => {
  if (!datetimeStr) return 0;
  const parts = datetimeStr.split(' ');
  if (parts.length < 2) return 0;
  const [h, m, s] = parts[1].split(':').map(Number);
  return h + m / 60 + (s || 0) / 3600;
};

// '2026/06/02 08:20:00' → '08:20'
const formatTime = (datetimeStr) => {
  if (!datetimeStr) return '';
  const parts = datetimeStr.split(' ');
  return parts.length >= 2 ? parts[1].slice(0, 5) : datetimeStr;
};

// 取出與 hourLabel 這個小時 bin 有時間重疊的 eqActions
// 改用 Date 物件比對（而非 decimal hour），原因：
//   hourLabel 格式為 "MM/DD HH"（含日期），EqAction 可能跨日（如 23:00~01:00）
//   只比對小時數字會誤判跨日 action，需要完整日期才能正確判斷重疊
const getActionsForBin = (hourLabel, eqActions) => {
  if (!eqActions?.length) return [];

  // 從 hourLabel 提取日期和小時，例："06/22 21" → datePart="06/22", hourStr="21"
  const [datePart, hourStr] = String(hourLabel).trim().split(' ');
  const binHour = Number(hourStr);

  if (Number.isNaN(binHour)) return [];

  // EIS hours 陣列存 "MM/DD HH" 格式（無年份），EqAction 存 "YYYY/MM/DD HH:MM:SS"
  // 統一轉成 Date 物件才能跨格式比對
  const getFullDate = (dateStr, hour = 0) => {
    if (dateStr.split('/').length === 2) {
      // "MM/DD" → 補上當年年份
      const now = new Date();
      return new Date(`${now.getFullYear()}/${dateStr} ${hour}:00:00`);
    }
    return new Date(dateStr.replace(/\//g, '-') + ` ${hour}:00:00`);
  };

  // bin 為一小時區間 [binHour, binHour+1)
  const binStart = getFullDate(datePart, binHour);
  const binEnd   = getFullDate(datePart, binHour + 1);

  return eqActions.filter((a) => {
    // EqAction 時間格式用 '/' 分隔，Date constructor 需換成 '-'
    const actionStart = new Date(a.begintime.replace(/\//g, '-'));
    const actionEnd   = new Date(a.endtime.replace(/\//g, '-'));
    // 標準 overlap 判斷：actionStart < binEnd && actionEnd > binStart
    return actionStart < binEnd && actionEnd > binStart;
  });
};

// 定義在 module 層級，讓 component 定義穩定不會每次 render 重建
// 透過 props 拿 eqActions，透過 useAxesTooltip() 拿 chart hover 資料
function CustomAxisTooltip({ eqActions }) {
  const tooltipData = useAxesTooltip();
  if (!tooltipData?.length) return null;

  const { axisValue, axisFormattedValue, seriesItems } = tooltipData[0];
  const hourLabel = axisFormattedValue ?? axisValue ?? '';
  const actions   = getActionsForBin(hourLabel, eqActions);
  // console.log(eqActions);
  
  return (
    <ChartsTooltipContainer trigger="axis">
      <Paper elevation={4} sx={{ p: 1.5, minWidth: 220, maxWidth: 340 }}>
        <Typography variant="subtitle2" fontWeight="bold" mb={0.5}>
          {hourLabel}
        </Typography>

        {seriesItems.map(({ seriesId, color, formattedLabel, formattedValue }) => (
          <Box
            key={seriesId}
            sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.15 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }}
              />
              <Typography variant="caption" color="text.secondary">
                {formattedLabel}
              </Typography>
            </Box>
            <Typography variant="caption" fontWeight="bold">
              {formattedValue}
            </Typography>
          </Box>
        ))}

        {actions.length > 0 && (
          <>
            <Divider sx={{ my: 0.8 }} />
            <Typography variant="caption" color="warning.main" fontWeight="bold" display="block" mb={0.5}>
              ⚠ 機況紀錄 <br />
              🄿 產品 : {actions[0].product}
            </Typography>
            {actions.map((a, i) => (
              <Box key={i} sx={{ mt: 0.5, pl: 0.8, borderLeft: '3px solid #FF9800' }}>
                {/* <Typography variant="caption" display="block" fontWeight="medium">
                  [產品] : {a.product}
                </Typography> */}
                <Typography variant="caption" display="block" fontWeight="medium">
                  [{a.eq}] : {a.code}
                </Typography>
                <Typography variant="caption" display="block" color="text.secondary">
                  {formatTime(a.begintime)} ~ {formatTime(a.endtime)}
                  {a.handler ? ` | 處理: ${a.handler}` : ''}
                </Typography>
                {a.action && (
                  <Typography
                    variant="caption"
                    display="block"
                    color="text.secondary"
                    sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                  >
                    {a.action}
                  </Typography>
                )}
              </Box>
            ))}
          </>
        )}
      </Paper>
    </ChartsTooltipContainer>
  );
}

const TrendChartMui = ({ rgbId, apiPath, hasTrendChartData, setHasTrendChartData }) => {
  const [trendData, setTrendData]   = useState(null);
  const [eqActions, setEqActions]   = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [chartWidth, setChartWidth] = useState(700);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      setChartWidth(entries[0].contentRect.width || 600);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [trendData]);

  useEffect(() => {
    if (!rgbId && !apiPath) {
      setTrendData(null);
      setEqActions([]);
      setHasTrendChartData(false); // 通知父元件（Dashboard）目前無資料，隱藏趨勢圖區塊
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const userStr = localStorage.getItem('user');
        const token   = userStr ? JSON.parse(userStr).token : '';
        const { data } = await axios.get(
          apiPath ? `${API_BASE_URL}${apiPath}` : `${API_BASE_URL}/api/trend-chart/by-rgb/${rgbId}`,
          { headers: { Authorization: token } }
        );
        setTrendData(data.trend);
        setEqActions(data.eqActions || []);
        setHasTrendChartData(true); // 通知父元件有資料，顯示趨勢圖區塊
      } catch (e) {
        if (e.response?.status === 404) {
          setError('尚無 Trend Chart 資料（爬蟲尚未執行或資料不存在）');
          setHasTrendChartData(false);
        } else {
          setError('載入 Trend Chart 失敗');
          setHasTrendChartData(false);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  // hasTrendChartData 加入 deps：父元件將其重置為 false 時（例如切換選取列）觸發重新 fetch
  }, [rgbId, apiPath, hasTrendChartData]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }
  if (error) {
    return (
      <Typography color="text.secondary" align="center" variant="body2" sx={{ py: 3 }}>
        {error}
      </Typography>
    );
  }
  if (!trendData) {
    return (
      <Typography color="text.secondary" align="center" variant="body2" sx={{ py: 3 }}>
        No Data
      </Typography>
    );
  }

  const { hours, output, input, defect_qty, defect_ratio, total } = trendData;
  const dataset = (hours ?? []).map((h, i) => ({
    hour:         h,
    output:       output?.[i]       ?? 0,
    input:        input?.[i]        ?? 0,
    defect_qty:   defect_qty?.[i]   ?? 0,
    defect_ratio: defect_ratio?.[i] ?? 0,
  }));

  return (
    <Box ref={containerRef}>
      {/* 標題 */}
      <Box sx={{ mb: -2 }}>
        <Typography variant="h6" fontWeight="bold" align='center'>
          {trendData.tool_id} 趨勢圖
        </Typography>
      </Box>
      <ChartContainer
        dataset={dataset}
        xAxis={[{ id: 'x-axis', dataKey: 'hour', scaleType: 'band', tickPlacement: 'middle', categoryGapRatio: 0.7, barGapRatio: -1.2 }]}
        yAxis={[
          { id: 'qty-axis',   position: 'left' },
          { id: 'ratio-axis', position: 'right' },
        ]}
        series={[
          { type: 'bar',  dataKey: 'input',        yAxisId: 'qty-axis',   label: 'Input(Sh)',   color: '#e0eb67' },
          { type: 'bar',  dataKey: 'output',       yAxisId: 'qty-axis',   label: 'Output(Sh)',  color: 'rgba(118, 240, 122, 0.8)' },
          { type: 'line', dataKey: 'defect_qty',   yAxisId: 'qty-axis',   label: '異常數量',    color: '#FF9800', showMark: true },
          { type: 'line', dataKey: 'defect_ratio', yAxisId: 'ratio-axis', label: '異常比例(%)', color: '#F44336', showMark: true },
        ]}
        sx={{
          '.MuiBarElement-root': {
            stroke: 'black',
            strokeWidth: 1,
          },
        }}
        width={chartWidth}
        height={420}
        margin={{ top: 30, right: 90, bottom: 25, left: 90 }}  // 增加 bottom
      >
        <ChartsGrid horizontal />
        <BarPlot />
        <LinePlot />
        <MarkPlot />
        <ChartsXAxis 
          axisId="x-axis"
          sx={{
            '& text': {
              textAnchor: 'start !important',
              transform: 'rotate(45deg)',
            },
          }}
        />
        <ChartsYAxis 
          axisId="qty-axis"   
          label="枚數 / 異常數" 
        />
        <ChartsYAxis axisId="ratio-axis" label="異常比例 (%)" />
        <CustomAxisTooltip eqActions={eqActions} />
        <ChartsLegend/>
      </ChartContainer>

      {total && (
        <Box sx={{ display: 'flex', gap: 4, justifyContent: 'center', mt: 1, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Output', value: total.output,      color: 'rgba(118, 240, 122, 0.8)', type:'bar' },
            { label: 'Total Input',  value: total.input,       color: '#e0eb67',  type:'bar' },
            { label: '總異常數',     value: total.defect_qty,  color: '#FF9800', type:'line' },
            { label: '平均異常比例', value: `${total.defect_ratio ?? 0}%`, color: '#F44336',  type:'line' },
          ].map(({ label, value, color, type }) => (
            <Box key={label} sx={{ display:'flex', alignItems: 'center', gap:1, }}>
              {type === 'bar' ? (
                <Box
                  sx={{
                    width: 14,
                    height: 14,
                    bgcolor: color,
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: 20,
                    height: 3,
                    bgcolor: color,
                  }}
                />
              )}

              <Typography variant="caption" color="text.secondary" display="block">
                {label}
              </Typography>
              <Typography variant="body2" fontWeight="bold" sx={{ color }}>
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default TrendChartMui;
