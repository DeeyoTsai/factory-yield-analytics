import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { API_BASE_URL } from '../../../config/api';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Alert, CircularProgress, Snackbar, ToggleButton, ToggleButtonGroup } from '@mui/material';
import EdcGroupSummaryTable from '../components/edc/EdcGroupSummaryTable';
import EdcFlaggedPanel from '../components/edc/EdcFlaggedPanel';
import EdcCrawlTriggerButton from '../components/edc/EdcCrawlTriggerButton';

const authConfig = () => {
  const userStr = localStorage.getItem('user');
  const token = userStr ? JSON.parse(userStr).token : '';
  return { headers: { Authorization: token } };
};

// 第1層每列的識別鍵，須帶 shift——同一天同站別/品種可能同時存在日班/夜班/自訂查詢三筆各自獨立的資料
const groupKey = (g) => `${g.station}|${g.recipe}|${g.shift}`;

const VIEW_MODE_LABEL = { day: '日班', night: '夜班', custom: '自訂區間' };

// 'YYYY-MM-DD HH:mm:ss' → 'YYYY/M/D HH:mm'（秒沒有意義，日期去掉補零較好讀）
const fmtRangeTime = (s) => {
  if (!s) return null;
  const [d, t] = String(s).split(' ');
  const [y, m, dd] = d.split('-');
  return `${y}/${Number(m)}/${Number(dd)} ${(t || '').slice(0, 5)}`;
};

// 顯示在「全距彙總」標題下方的查詢範圍＝匯入時查詢的時間窗（windowStart/windowEnd），
// **不是** glass 的實際首尾時間（eventStart/eventEnd）——後者是「這個區間內剛好有幾片」的結果，
// 使用者要看的是「這批是撈哪一段」。
// windowStart/windowEnd 為 NULL 的情況：2026-08-06 之前爬的 day/night 資料（當時只有 custom 才存
// window_*），重爬一次就會有值。
const deriveQueryRange = (groups) => {
  let start = null, end = null;
  for (const g of groups) {
    if (g.windowStart && (!start || g.windowStart < start)) start = g.windowStart;
    if (g.windowEnd && (!end || g.windowEnd > end)) end = g.windowEnd;
  }
  if (!start || !end) return null;
  return { start: fmtRangeTime(start), end: fmtRangeTime(end) };
};

const EdcRangeView = () => {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  // 日班/夜班/自訂查詢三種分開顯示，避免混在同一份清單裡看不清楚
  const [viewMode, setViewMode] = useState('day'); // 'day' | 'night' | 'custom'
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  // ── 第 2 層明細 state：全部來自 GET /api/edc/group/flagged（handleSelectGroup 內設定）──
  // 後端 edcController.getGroupFlagged() 現組回應，這裡收到後原封不動傳給 EdcFlaggedPanel → EdcColumnTrendChart。
  const [selectedGroup, setSelectedGroup] = useState(null);
  // groupSegments：分段 meta（給第 2 層頂部 Chip）。來源 edc_segments（model EdcSegment），
  //   每列一段：{ id, segment_index, event_start, event_end, glass_count, boundary_reason, recipe,
  //   max_range, max_range_column, over_spec }。ingestion adapter 整批 destroy-CASCADE 重建。
  const [groupSegments, setGroupSegments] = useState([]);
  // flaggedGlass：段內離群邏輯挑出的「兇手基板」清單，一片一列。
  //   主體來源 edc_flagged_glass（model EdcFlaggedGlass）：
  //     { id, edc_segment_id, glass_id, event_datetime, station, machine, recipe,
  //       column_name（哪一欄離群，例 Shot3_Final_RRY）, value（那格量測值）,
  //       segment_median, segment_range, side（'max'偏上緣 / 'min'偏下緣） }
  //   後端再 left-join edc_glass_comment（model EdcGlassComment，自然鍵
  //     day+station+machine+glass_id+column_name，**匯入流程永不觸碰**）補上人工欄位 { confirmed, comment }。
  //   用途：散點圖畫放大紅點 + 下方 EdcFlaggedGlassTable 可勾選確認並下 comment（PUT /api/edc/comment）。
  const [flaggedGlass, setFlaggedGlass] = useState([]);
  // byColumn：逐欄位、逐段的完整序列，給散點圖用。key＝監控欄位名
  //   `Shot{n}_Final_{FRX|FRY|FLX|FLY|RLX|RLY|RRX|RRY}`（只有這批有非零值的欄位會出現）。value：
  //     { overSpec, groupMaxRange, segments: [{ segment_index, boundary_reason, recipe,
  //       min, max, avg, median, range, overSpec, points: [{ glass_id, event_datetime, value }] }] }
  //   資料表：min/max/avg/median/range 來自 edc_segments.stats（JSON 欄，一段一列）；
  //   points 逐片 glass 來自 edc_glass_records（model EdcGlassRecord，一片一列，
  //   欄位名同來源系統原始欄名）。兩表皆由 ingestion adapter 整批重建。
  const [byColumn, setByColumn] = useState({});
  // outlierThreshold：後端 DEFAULT_CONFIG.outlierThreshold（預設 2），非資料表。
  //   傳給散點圖當 threshold，畫每段管制上下限線 = 中位數 ± threshold。
  const [outlierThreshold, setOutlierThreshold] = useState(2);

  // 爬蟲執行狀態：改由這裡統一輪詢（原本 EdcCrawlTriggerButton.jsx 自己也輪詢一份，兩邊各查各的沒意義），
  // 一方面驅動下方頁面頂部「執行中」橫幅，另一方面偵測「執行中→完成」瞬間自動重新抓取資料，
  // 不用使用者手動重新整理頁面。
  const [crawlStatus, setCrawlStatus] = useState({ running: false, lastRunAt: null, cooldownRemainSec: 0, lastError: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const prevRunningRef = useRef(false);
  const selectedGroupRef = useRef(null);

  const dayStr = selectedDate.format('YYYY-MM-DD');

  // 抓第1層彙總（GET /api/edc/summary），日期切換或爬蟲跑完都會呼叫。
  // 每次重抓都先清掉第2層選取狀態，避免殘留上一個日期/群組的明細畫面
  const fetchSummary = useCallback(async (date) => {
    setLoading(true);
    setSelectedGroup(null); setGroupSegments([]); setFlaggedGlass([]); setByColumn({});
    try {
      const { data } = await axios.get(
        `${API_BASE_URL}/api/edc/summary?day=${date.format('YYYY-MM-DD')}`, authConfig());
      setGroups(data.groups || []);
    } catch (e) {
      console.error('edc summary error:', e);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSummary(selectedDate); }, [selectedDate, fetchSummary]);

  const fetchCrawlStatus = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/edc/crawl/status`, authConfig());
      setCrawlStatus(data);
    } catch (e) { /* 輪詢失敗不影響其他功能，靜默略過 */ }
  }, []);

  useEffect(() => {
    fetchCrawlStatus();
    const timer = setInterval(fetchCrawlStatus, 4000);
    return () => clearInterval(timer);
  }, [fetchCrawlStatus]);

  // 偵測「執行中 → 完成」的瞬間：自動重新抓取彙總表（+ 若第2層有選取中的群組，一併重新抓取），
  // 讓使用者不用手動重新整理頁面就能看到最新結果；同時跳出 Snackbar 明確告知已更新。
  useEffect(() => {
    if (prevRunningRef.current && !crawlStatus.running) {
      fetchSummary(selectedDate);
      if (selectedGroupRef.current) handleSelectGroup(selectedGroupRef.current);
      setSnackbar({
        open: true,
        severity: crawlStatus.lastError ? 'warning' : 'success',
        message: crawlStatus.lastError ? `爬蟲執行完成，但發生錯誤：${crawlStatus.lastError}` : '爬蟲執行完成，資料已自動更新',
      });
    }
    prevRunningRef.current = crawlStatus.running;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crawlStatus.running]);

  const handleCrawlTriggered = () => {
    // 樂觀更新，不用等下一輪（4s）輪詢才反映觸發成功
    setCrawlStatus((prev) => ({ ...prev, running: true }));
    fetchCrawlStatus();
  };

  const visibleGroups = groups.filter((g) => g.shift === viewMode);
  const queryRange = deriveQueryRange(visibleGroups);

  const handleSetViewMode = (v) => {
    if (!v) return;
    setViewMode(v);
    // 切換檢視模式時清掉第2層選取，避免殘留另一個模式的資料
    selectedGroupRef.current = null;
    setSelectedGroup(null); setGroupSegments([]); setFlaggedGlass([]); setByColumn({});
  };

  // 點第1層某一列 → 抓該群組的第2層明細（GET /api/edc/group/flagged，需帶 day/station/recipe/shift 四個參數）
  const handleSelectGroup = async (group) => {
    selectedGroupRef.current = group; // 存進 ref 供上面「爬蟲完成自動刷新」的 effect 讀取，不放進 state 是為了不觸發額外 re-render
    setSelectedGroup(group);
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/edc/group/flagged`, {
        ...authConfig(),
        params: { day: dayStr, station: group.station, recipe: group.recipe, shift: group.shift },
      });
      setGroupSegments(data.segments || []);
      setFlaggedGlass(data.flaggedGlass || []);
      setByColumn(data.byColumn || {});
      if (Number.isFinite(data.outlierThreshold)) setOutlierThreshold(data.outlierThreshold);
    } catch (e) {
      console.error('edc group flagged error:', e);
      setGroupSegments([]); setFlaggedGlass([]); setByColumn({});
    }
  };

  // 儲存人工確認/備註（PUT /api/edc/comment，自然鍵見 EdcGlassComment 模型，爬蟲重爬不會動這張表）
  const handleSaveComment = async (row, draft) => {
    await axios.put(`${API_BASE_URL}/api/edc/comment`, {
      day: dayStr,
      station: row.station,
      machine: row.machine,
      glass_id: row.glass_id,
      column_name: row.column_name,
      confirmed: draft.confirmed,
      comment: draft.comment,
    }, authConfig());
    // 存檔成功後重新整理，確保畫面顯示的是伺服器最新值
    if (selectedGroup) await handleSelectGroup(selectedGroup);
  };

  return (
    <div className="container-fluid py-4" style={{ padding: '0 2.5rem' }}>
      <div className="d-flex justify-content-between align-items-center mb-4 mt-3 flex-wrap gap-3">
        <h2 className="mb-0 fw-bold">EDC 全距監控</h2>
        <div className="d-flex align-items-center gap-3 flex-wrap">
          <EdcCrawlTriggerButton status={crawlStatus} onTriggerSuccess={handleCrawlTriggered} />
          <ToggleButtonGroup size="small" exclusive value={viewMode} onChange={(e, v) => handleSetViewMode(v)}>
            <ToggleButton value="day">日班</ToggleButton>
            <ToggleButton value="night">夜班</ToggleButton>
            <ToggleButton value="custom">自訂區間</ToggleButton>
          </ToggleButtonGroup>
          <div style={{ width: '260px' }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker label="Select Date" value={selectedDate}
                onChange={(v) => setSelectedDate(v)} format="YYYY-MM-DD"
                slotProps={{ textField: { fullWidth: true, size: 'small' } }} />
            </LocalizationProvider>
          </div>
        </div>
      </div>

      {/* 頁面頂部大橫幅：比按鈕旁的小 Chip 更顯眼，讓使用者即使沒點開觸發按鈕也能一眼看到爬蟲正在跑，
          且明講「不用手動刷新」，避免使用者誤以為要自己重新整理頁面 */}
      {crawlStatus.running && (
        <Alert severity="info" icon={<CircularProgress size={18} thickness={5} />} sx={{ mb: 3 }}>
          <strong>EDC 爬蟲背景執行中</strong>　完成後這裡的資料會自動更新，不需要手動重新整理頁面。
        </Alert>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((s) => ({ ...s, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {loading ? (
        <div className="d-flex justify-content-center p-5"><CircularProgress /></div>
      ) : (
        <>
          {/* 第 1 層：站別A~站別F by 品種+班別 彙總（比照 Excel「匯集」分頁），只列最大全距+燈號 */}
          <div className="row g-4 mb-4">
            <div className="col-12">
              <div className="card shadow-sm border-0">
                <div className="card-header border-0 py-3 d-flex justify-content-between align-items-start"
                  style={{ backgroundColor: '#a7f3d0' }}>
                  <div>
                    <h5 className="mb-0 d-flex align-items-center gap-2 flex-wrap">
                      全距彙總
                      {/* 目前檢視的班別（跟頁首 ToggleButtonGroup 連動）——三種班別各自獨立顯示，
                          標題不標的話容易忘記現在看的是哪一批 */}
                      <span className="badge rounded-pill" style={{ backgroundColor: '#065f46', fontSize: '0.75rem' }}>
                        {VIEW_MODE_LABEL[viewMode]}
                      </span>
                    </h5>
                    <small className="text-muted">
                      {queryRange
                        ? `（資料範圍：${queryRange.start} ~ ${queryRange.end}）`
                        : (visibleGroups.length ? '（此批資料無查詢區間紀錄，重爬一次即會顯示）' : '（該日期無資料）')}
                    </small>
                  </div>
                  <small className="text-muted">綠燈全距&lt;4／紅燈全距&gt;=4，點列查看異常基板（by shot）</small>
                </div>
                <div className="card-body p-2">
                  <EdcGroupSummaryTable groups={visibleGroups}
                    selectedKey={selectedGroup ? groupKey(selectedGroup) : null} onSelectGroup={handleSelectGroup} />
                </div>
              </div>
            </div>
          </div>

          {/* 第 2 層：異常基板 + by shot 散點圖 */}
          <div className="row g-4 mb-4">
            <div className="col-12">
              {selectedGroup ? (
                <div className="card shadow-sm border-0">
                  <div className="card-header border-0 py-3 d-flex justify-content-between align-items-center"
                    style={{ backgroundColor: '#bfdbfe' }}>
                    <h5 className="mb-0">
                      ▸ {selectedGroup.station}｜{selectedGroup.recipe}
                    </h5>
                    <button type="button" className="btn btn-sm btn-outline-secondary"
                      onClick={() => { selectedGroupRef.current = null; setSelectedGroup(null); }}>✕ 清除</button>
                  </div>
                  <div className="card-body">
                    <EdcFlaggedPanel group={selectedGroup} segments={groupSegments} flaggedGlass={flaggedGlass}
                      byColumn={byColumn} threshold={outlierThreshold}
                      onSaveComment={handleSaveComment} />
                  </div>
                </div>
              ) : (
                visibleGroups.length > 0 && (
                  <div className="card border-0 bg-light">
                    <div className="card-body text-center text-muted py-3">
                      點選上方列，這裡會顯示該站別/品種/班別的異常基板與散點圖
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EdcRangeView;
