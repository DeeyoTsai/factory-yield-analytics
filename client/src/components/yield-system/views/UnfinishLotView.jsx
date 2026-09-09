import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { API_BASE_URL } from '../../../config/api';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import {
  Paper, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Link, CircularProgress,
} from '@mui/material';
import ReactECharts from 'echarts-for-react';
import UnfinishGlassTable from '../components/unfinish/UnfinishGlassTable';
import UnfinishDefectMap from '../components/unfinish/UnfinishDefectMap';
import UnfinishLotOverviewChart from '../components/unfinish/UnfinishLotOverviewChart';
import AdiHistoryTable from '../components/dashboard/AdiHistoryTable';
import ReworkHisTable from '../components/dashboard/ReworkHisTable';
import TrendChartMui from '../components/dashboard/TrendChartMui';

// 與 Dashboard 相同的認證 header 取法
const authConfig = () => {
  const userStr = localStorage.getItem('user');
  const token = userStr ? JSON.parse(userStr).token : '';
  return { headers: { Authorization: token } };
};

// 接自己場域時換成實際的來源明細頁 URL
const EIS_DEFECT_URL = (lotno) => "#";

const UnfinishLotView = () => {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedLot, setSelectedLot] = useState(null);   // UnfinishLot row
  const [defects, setDefects] = useState([]);
  const [selectedDefect, setSelectedDefect] = useState(null); // UnfinishDefect row（含 hasDetails）
  const [details, setDetails] = useState([]);
  const [adiHistory, setAdiHistory] = useState([]);
  const [reworkHistory, setReworkHistory] = useState([]);
  const [selectedGlassIds, setSelectedGlassIds] = useState([]); // Glass Details 勾選（預設全選），Defect Map / ADI History 連動
  const [hasTrendChartData, setHasTrendChartData] = useState(true);

  // 依日期抓未結批主表
  const fetchLots = useCallback(async (date) => {
    if (!date) return;
    setLoading(true);
    setSelectedLot(null); setDefects([]); setSelectedDefect(null); setDetails([]); setAdiHistory([]); setReworkHistory([]); setSelectedGlassIds([]);
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/api/unfinish-lot/list?day=${date.format('YYYY-MM-DD')}`, authConfig());
      setLots(data.lots || []);
    } catch (e) {
      console.error('unfinish-lot list error:', e);
      setLots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedDate.format('YYYY-MM-DD') == dayjs().format('YYYY-MM-DD')) {
      const nowHour = new Date().getHours();
      const shiftDay = (nowHour < 12) ? 1 : 0;
      const showDate = selectedDate.subtract(shiftDay, 'day')
      fetchLots(showDate)
    } else {
      fetchLots(selectedDate);
    }
  }, [selectedDate, fetchLots]);

  // 選 lot → 抓 defect 統計
  const handleSelectLot = async (lot) => {
    setSelectedLot(lot); setDefects([]); setSelectedDefect(null); setDetails([]); setAdiHistory([]); setReworkHistory([]); setSelectedGlassIds([]);
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/unfinish-lot/${lot.id}/defects`, authConfig());
      setDefects(data.defects || []);
    } catch (e) { console.error('defects error:', e); setDefects([]); }
  };

  // 選 defect → 有明細才抓 glass/ADI/Rework（trend 由 TrendChartMui 自抓）
  const handleSelectDefect = async (defect) => {
    setSelectedDefect(defect); setDetails([]); setAdiHistory([]); setReworkHistory([]); setSelectedGlassIds([]); setHasTrendChartData(true);
    if (!defect.hasDetails) return;
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/api/unfinish-lot/defect/${defect.id}/details`, authConfig());
      setDetails(data.details || []);
      setAdiHistory(data.adiHistory || []);
      setReworkHistory(data.reworkHistory || []);
      setSelectedGlassIds((data.details || []).map((r) => r.id)); // 預設全選
    } catch (e) { console.error('details error:', e); }
  };

  // 良率長條圖（已停用：與主表「全良率」欄位重複，佔版面 — 需要時取消註解並於 JSX 復原區塊）
  // const yieldBarOption = {
  //   tooltip: { trigger: 'axis' },
  //   xAxis: { type: 'category', data: lots.map((l) => l.lotno) },
  //   yAxis: { type: 'value', name: '全良率(%)', min: (v) => Math.floor(v.min - 1) },
  //   series: [{ type: 'bar', data: lots.map((l) => l.yield_rate), label: { show: true, position: 'top' } }],
  //   grid: { left: 50, right: 20, top: 40, bottom: 30 },
  // };

  // defect 分布：有明細（可點入分析）藍色、未達門檻灰色 — 可點性直接用顏色表達
  // ratio = defect 數量 ÷ 主表同 lot 的「總計」，左軸 Qty 長條 + 右軸 Ratio% 折線雙軸呈現，tooltip 展示計算公式
  const lotTotal = selectedLot?.total || 0;
  const defectRatio = (qty) => (lotTotal > 0 ? (qty / lotTotal) * 100 : null);
  const defectBarOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const d = defects[params[0]?.dataIndex];
        if (!d) return '';
        const r = defectRatio(d.qty);
        const ratioLine = r !== null
          ? `Ratio：${d.qty} ÷ ${lotTotal}（${selectedLot.lotno} 總計）= ${r.toFixed(2)}%`
          : 'Ratio：無法計算（該 lot 總計為 0）';
        return `${d.defectcode}<br/>數量：${d.qty}<br/>${ratioLine}<br/>${d.hasDetails ? '✔ 點擊查看分析' : '未達明細門檻'}`;
      },
    },
    legend: { data: ['Qty', 'Ratio'], top: 0 },
    xAxis: { type: 'category', data: defects.map((d) => d.defectcode), axisLabel: { rotate: 30 } },
    yAxis: [
      { type: 'value', name: 'Qty' },
      { type: 'value', name: 'Ratio(%)', position: 'right', axisLabel: { formatter: '{value}%' } },
    ],
    series: [
      {
        // 主 series：qty 長條（長條中間顯示數量），點擊進入分析
        name: 'Qty',
        type: 'bar',
        yAxisIndex: 0,
        data: defects.map((d) => ({
          value: d.qty,
          itemStyle: { color: d.hasDetails ? '#3b82f6' : '#cbd5e1' },
          label: { color: d.hasDetails ? '#ffffff' : '#1e293b' }, // 藍底白字、灰底深字，維持可讀性
        })),
        label: { show: true, position: 'inside', fontWeight: 'bold' },
      },
      {
        // ratio 折線：右軸，數值為 null 時不繪點（該 lot 總計為 0，無法計算）
        name: 'Ratio',
        type: 'line',
        yAxisIndex: 1,
        data: defects.map((d) => {
          const r = defectRatio(d.qty);
          return r !== null ? Number(r.toFixed(2)) : null;
        }),
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: { color: '#f97316' },
        lineStyle: { color: '#f97316', width: 2 },
        label: { show: true, position: 'top', formatter: (p) => (p.value != null ? `${p.value}%` : '') },
        connectNulls: false,
      },
    ],
    grid: { left: 50, right: 50, top: 40, bottom: 70 },
  };

  // 清除選擇（回上一層）
  const clearLot = () => {
    setSelectedLot(null); setDefects([]); setSelectedDefect(null); setDetails([]); setAdiHistory([]); setReworkHistory([]); setSelectedGlassIds([]);
  };
  const clearDefect = () => {
    setSelectedDefect(null); setDetails([]); setAdiHistory([]); setReworkHistory([]); setSelectedGlassIds([]);
  };

  // Glass Details 勾選連動：Defect Map 用勾選列、ADI/Rework History 用勾選列的 glassid（同 glassid 多列時任一勾選即顯示）
  const filteredDetails = details.filter((r) => selectedGlassIds.includes(r.id));
  const selectedGids = new Set(filteredDetails.map((r) => r.glassid));
  const filteredAdiHistory = adiHistory.filter((a) => selectedGids.has(a.gid));
  const filteredReworkHistory = reworkHistory.filter((r) => selectedGids.has(r.gid));

  return (
    <div className="container-fluid py-4" style={{ padding: '0 2.5rem' }}>
      {/* 頁首：左標題 + 右日期（對齊 Daily Yield）*/}
      <div className="d-flex justify-content-between align-items-center mb-4 mt-3">
        <h2 className="mb-0 fw-bold">未結批良率</h2>
        <div style={{ width: '300px' }}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker label="Select Date" value={selectedDate}
              onChange={(v) => setSelectedDate(v)} format="YYYY-MM-DD"
              slotProps={{ textField: { fullWidth: true, size: 'small' } }} />
          </LocalizationProvider>
        </div>
      </div>

      {loading ? (
        <div className="d-flex justify-content-center p-5"><CircularProgress /></div>
      ) : (
        <>
          {/* ── 第 1 層：Lot 清單（淡綠 header，同 Daily Yield）── */}
          <div className="row g-4 mb-4">
            <div className="col-12">
              <div className="card shadow-sm border-0">
                <div className="card-header border-0 py-3 d-flex justify-content-between align-items-center"
                  style={{ backgroundColor: '#a7f3d0' }}>
                  <h5 className="mb-0">未結批 Lot 清單</h5>
                  <small className="text-muted">依全良率排序，越上面越差；點選長條或表格列查看 Defect 分布</small>
                </div>
                <div className="card-body p-2">
                  {lots.length > 0 && (
                    <div className="mb-3">
                      <UnfinishLotOverviewChart lots={lots} onSelectLot={handleSelectLot} />
                    </div>
                  )}
                  <TableContainer sx={{ maxHeight: 360 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          {['LOTNO','站別','O','OK','1DL','2DL','3DL','多丁','NG','LS','總計','投入','全良率','收率','品種','投入日','EIS'].map((h) => (
                            <TableCell key={h} sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>{h}</TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {lots.length ? lots.map((l) => (
                          <TableRow hover key={l.id} selected={selectedLot?.id === l.id}
                            onClick={() => { if (window.getSelection().toString()) return; handleSelectLot(l); }}
                            sx={{ cursor: 'pointer' }}>
                            <TableCell sx={{ fontWeight: 'bold' }}>{l.lotno}</TableCell><TableCell>{l.stage}</TableCell>
                            <TableCell>{l.o_qty}</TableCell><TableCell>{l.ok_qty}</TableCell>
                            <TableCell>{l.dl1}</TableCell><TableCell>{l.dl2}</TableCell>
                            <TableCell>{l.dl3}</TableCell><TableCell>{l.multi_dl}</TableCell>
                            <TableCell>{l.ng}</TableCell><TableCell>{l.ls}</TableCell>
                            <TableCell>{l.total}</TableCell><TableCell>{l.input_qty}</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>{l.yield_rate}%</TableCell><TableCell>{l.recovery_rate}%</TableCell>
                            <TableCell>{l.product}</TableCell><TableCell>{l.input_date}</TableCell>
                            <TableCell>
                              <Link href={EIS_DEFECT_URL(l.lotno)} target="_blank" rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}>明細</Link>
                            </TableCell>
                          </TableRow>
                        )) : (
                          <TableRow><TableCell colSpan={17} align="center">該日期無未結批資料</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </div>
              </div>
            </div>
          </div>

          {/* 良率長條圖（已停用：與主表「全良率」欄重複 — 需要時取消註解，option 定義見上方 yieldBarOption）
          {lots.length > 0 && (
            <div className="row g-4 mb-4"><div className="col-12">
              <div className="card shadow-sm border-0">
                <div className="card-header border-0 py-3" style={{ backgroundColor: '#a7f3d0' }}>
                  <h5 className="mb-0">各 Lot 全良率</h5>
                </div>
                <div className="card-body">
                  <ReactECharts option={yieldBarOption} style={{ height: 300 }} notMerge
                    onEvents={{ click: (p) => { const lot = lots[p.dataIndex]; if (lot) handleSelectLot(lot); } }} />
                </div>
              </div>
            </div></div>
          )}
          */}

          {/* ── 第 2 層：Defect 分布（淡藍 header；未選 lot 時顯示引導）── */}
          <div className="row g-4 mb-4">
            <div className="col-12">
              {selectedLot ? (
                <div className="card shadow-sm border-0">
                  <div className="card-header border-0 py-3 d-flex justify-content-between align-items-center"
                    style={{ backgroundColor: '#bfdbfe' }}>
                    <h5 className="mb-0">▸ {selectedLot.lotno}｜Defect 分布</h5>
                    <div className="d-flex align-items-center gap-3">
                      <small className="text-muted">藍色長條＝可點入分析（非排除類、Defect Ratio≥0.8%或數量≥8、前5大）</small>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={clearLot}>
                        ✕ 清除
                      </button>
                    </div>
                  </div>
                  <div className="card-body">
                    {defects.length ? (
                      <ReactECharts option={defectBarOption} style={{ height: 300 }} notMerge
                        onEvents={{ click: (p) => { const d = defects[p.dataIndex]; if (d) handleSelectDefect(d); } }} />
                    ) : (
                      <p className="text-center text-muted py-4 mb-0">此 lot 無 defect 資料</p>
                    )}
                  </div>
                </div>
              ) : (
                lots.length > 0 && (
                  <div className="card border-0 bg-light">
                    <div className="card-body text-center text-muted py-3">
                      點選上方 Lot 列或長條圖，這裡會顯示該 lot 的 Defect 分布
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* ── 第 3 層：Defect 分析（淡琥珀 header，四區塊收在同一張卡）── */}
          {selectedDefect && (
            <div className="row g-4 mb-4">
              <div className="col-12">
                {selectedDefect.hasDetails ? (
                  <div className="card shadow-sm border-0">
                    <div className="card-header border-0 py-3 d-flex justify-content-between align-items-center"
                      style={{ backgroundColor: '#fde68a' }}>
                      <h5 className="mb-0">▸ {selectedLot.lotno}｜{selectedDefect.defectcode}（{selectedDefect.qty} 片）分析</h5>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={clearDefect}>
                        ✕ 清除
                      </button>
                    </div>
                    <div className="card-body">
                      {/* Row 1：Glass Details 全寬 → Row 2：ADI History 全寬 → Row 3：Defect Map + Rework History 各半 → Row 4：集中趨勢圖 全寬 */}
                      {/* 注意：MUI v7 的 Grid 已改新 API（item/xs/md 失效），版面一律用 Bootstrap row/col */}
                      {/* Glass Details 勾選（預設全選）連動：Defect Map/Rework History 以勾選列過濾、ADI History 以勾選列的 glassid 過濾 */}
                      <div className="row g-3">
                        <div className="col-12">
                          <UnfinishGlassTable details={details}
                            selectedIds={selectedGlassIds} onSelectionChange={setSelectedGlassIds} />
                        </div>
                        <div className="col-12">
                          <Paper sx={{ p: 1 }}>
                            <Typography variant="h6" align="center" sx={{ fontWeight: 'bold' }}>ADI History</Typography>
                            <AdiHistoryTable data={filteredAdiHistory} />
                          </Paper>
                        </div>
                        {/* Row 3：Defect Map / Rework History — 同款 card 包覆 + h-100 等高（同 Dashboard）*/}
                        <div className="col-12 col-md-6">
                          <div className="card h-100 shadow-sm border-0">
                            <div className="card-header border-0 py-2 text-center" style={{ backgroundColor: '#f8f9fa'}}>
                              <h6 className="mb-0 fw-bold">{selectedDefect.defectcode} Defect Map</h6>
                            </div>
                            <div className="card-body d-flex justify-content-center align-items-center">
                              <UnfinishDefectMap details={filteredDetails} />
                            </div>
                          </div>
                        </div>
                        <div className="col-12 col-md-6">
                          <div className="card h-100 shadow-sm border-0">
                            <div className="card-header border-0 py-2 text-center" style={{ backgroundColor: '#f8f9fa'}}>
                              <h6 className="mb-0 fw-bold">Rework History</h6>
                            </div>
                            <div className="card-body">
                              <ReworkHisTable data={filteredReworkHistory} />
                            </div>
                          </div>
                        </div>
                        {/* Row 4：集中趨勢圖 — 獨立一整列 */}
                        <div className="col-12">
                          <div className="card shadow-sm border-0">
                            <div className="card-header border-0 py-2 text-center" style={{ backgroundColor: '#f8f9fa' }}>
                              <h6 className="mb-0 fw-bold">集中趨勢圖</h6>
                            </div>
                            <div className="card-body d-flex justify-content-center align-items-center">
                              {/* 圖表置中：寬欄時 cap 700 水平置中，窄欄時縮滿（TrendChartMui 內部 ResizeObserver 會跟隨容器寬度）*/}
                              <div className='w-100'>
                                <TrendChartMui apiPath={`/api/unfinish-lot/defect/${selectedDefect.id}/trend`}
                                  hasTrendChartData={hasTrendChartData} setHasTrendChartData={setHasTrendChartData} />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="card shadow-sm border-0">
                    <div className="card-body text-center py-3">
                      <span className="text-muted">
                        {selectedDefect.defectcode} 未達明細爬取門檻（非排除類、數量≥10、前5大），
                        可至 <Link href={EIS_DEFECT_URL(selectedLot.lotno)} target="_blank" rel="noreferrer">來源明細頁</Link> 查看
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UnfinishLotView;
