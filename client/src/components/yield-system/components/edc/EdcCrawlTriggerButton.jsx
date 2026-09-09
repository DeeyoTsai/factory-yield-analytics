import React, { useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { Button, Chip, CircularProgress, Typography, ToggleButton, ToggleButtonGroup, Popover } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { API_BASE_URL } from '../../../../config/api';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAY_HOURS = Array.from({ length: 13 }, (_, i) => 7 + i); // 07~19（日班範圍）
const NIGHT_BEGIN_HOURS = Array.from({ length: 5 }, (_, i) => 19 + i); // 19~23
const NIGHT_END_HOURS_SAME_DAY = Array.from({ length: 5 }, (_, i) => 19 + i); // 19~23
const NIGHT_END_HOURS_NEXT_DAY = Array.from({ length: 8 }, (_, i) => i); // 00~07
const hourLabel = (h) => `${String(h).padStart(2, '0')}:00`;

const authConfig = () => {
  const userStr = localStorage.getItem('user');
  const token = userStr ? JSON.parse(userStr).token : '';
  return { headers: { Authorization: token } };
};

// 網頁觸發爬蟲：收進一顆「手動觸發爬蟲」按鈕 + Popover，不在頁面上常駐展開。
// 改版緣由：這組控制項跟 EdcRangeView.jsx 頁首的「班別模式/自訂區間」檢視篩選長得一樣、擺在同一排，
// 兩者其實無關（這裡是「觸發爬蟲動作」，頁首那組是「篩選已爬到的資料要看哪些」），容易搞混，
// 改成收在按鈕後面的 Popover，且內部用詞改「依班別/自訂時間」跟頁首篩選的用詞區隔開。
// Popover 內兩種模式：
// ①「依班別」：日班/夜班分開選，日期時間下拉限制在該班別的合法範圍內（伺服器端 edcController.js 會再驗證一次）
// ②「自訂時間」：起訖日期+整點時間完全自由指定，可跨班別，整批當一批分析（shift='custom'）
// 兩者都 POST 同一支 /api/edc/crawl，執行狀態（running/冷卻/上次更新）改由父層 EdcRangeView.jsx
// 統一輪詢並以 props 傳入——原本這裡自己也輪詢一份，跟父層新增的頁面級「執行中」大橫幅各查各的，
// 兩份 setInterval 打同一支 API 沒有意義；改成單一來源，觸發成功當下再額外呼叫 onTriggerSuccess()
// 讓父層立刻樂觀更新 running=true 並馬上重新查一次狀態，不用等下一輪（4s）輪詢才反映。
const EdcCrawlTriggerButton = ({ status, onTriggerSuccess }) => {
  const [message, setMessage] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [mode, setMode] = useState('shift'); // 'shift' | 'custom'

  // 班別模式狀態
  const today = dayjs().format('YYYY-MM-DD');
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
  const [shiftType, setShiftType] = useState('day'); // 'day' | 'night'
  const [dayBeginHour, setDayBeginHour] = useState(7);
  const [dayEndHour, setDayEndHour] = useState(19);
  const [nightBeginHour, setNightBeginHour] = useState(19);
  const [nightEndDateOption, setNightEndDateOption] = useState('today'); // 'today' | 'tomorrow'
  const [nightEndHour, setNightEndHour] = useState(23);

  // 自訂區間狀態
  const [customBeginDate, setCustomBeginDate] = useState(dayjs());
  const [customBeginHour, setCustomBeginHour] = useState(7);
  const [customEndDate, setCustomEndDate] = useState(dayjs());
  const [customEndHour, setCustomEndHour] = useState(19);

  // 共用送出邏輯：POST /api/edc/crawl。後端用 lock 檔+冷卻時間擋重複執行（見 edcCrawlRunner.js），
  // 失敗時依 reason 顯示對應訊息；成功則收起 Popover，交給 onTriggerSuccess() 通知父層更新執行狀態。
  const triggerCrawl = async (body, busyMessage) => {
    setMessage('');
    try {
      await axios.post(`${API_BASE_URL}/api/edc/crawl`, body, authConfig());
      setMessage(busyMessage);
      setAnchorEl(null); // 觸發成功後收起 Popover，執行狀態改看按鈕旁的 Chip／頁面頂部橫幅
      onTriggerSuccess?.();
    } catch (e) {
      const res = e.response?.data;
      if (res?.reason === 'running') setMessage('爬蟲執行中，請稍候');
      else if (res?.reason === 'cooldown') setMessage(`剛更新過，請稍候約 ${res.cooldownRemainSec} 秒`);
      else setMessage('觸發失敗：' + (res?.message || e.message));
    }
  };

  // 依班別送出：日班固定今天+07~19；夜班起始固定今天+19~23，結束日可選今天或明天（跨夜），
  // 範圍已由上面的下拉選單限制在合法區間內，後端 isValidShiftWindow() 會再驗證一次，不能只信前端
  const handleShiftTrigger = () => {
    if (shiftType === 'day') {
      triggerCrawl({
        mode: 'shift', shiftType: 'day',
        beginDate: today, beginHour: dayBeginHour, endDate: today, endHour: dayEndHour,
      }, '已開始爬取日班區間');
    } else {
      const endDate = nightEndDateOption === 'today' ? today : tomorrow;
      triggerCrawl({
        mode: 'shift', shiftType: 'night',
        beginDate: today, beginHour: nightBeginHour, endDate, endHour: nightEndHour,
      }, '已開始爬取夜班區間');
    }
  };

  // 自訂時間送出：起訖日期+整點時間完全自由指定，可跨班別，後端整批當一批分析（shift='custom'）
  const handleCustomTrigger = () => triggerCrawl({
    mode: 'custom',
    beginDate: customBeginDate.format('YYYY-MM-DD'), beginHour: customBeginHour,
    endDate: customEndDate.format('YYYY-MM-DD'), endHour: customEndHour,
  }, '已開始爬取自訂區間');

  // 執行中或冷卻中都要擋送出，避免使用者連點造成多個 puppeteer 排隊/重複觸發
  const disabled = status.running || status.cooldownRemainSec > 0;

  return (
    <div className="d-flex align-items-center gap-2 flex-wrap">
      <Button variant="outlined" size="small" startIcon={<RefreshIcon />}
        onClick={(e) => setAnchorEl(e.currentTarget)}>
        手動觸發爬蟲
      </Button>

      {/* 按鈕旁的即時狀態標示——執行中/冷卻中用有顏色的 Chip，比純文字明顯，
          搭配 EdcRangeView.jsx 頁面頂部的大橫幅，讓使用者不用點開 Popover 也能一眼看到目前狀態 */}
      {status.running ? (
        <Chip size="small" color="info" icon={<CircularProgress size={12} color="inherit" />} label="爬蟲執行中" />
      ) : status.cooldownRemainSec > 0 ? (
        <Chip size="small" variant="outlined" label={`冷卻中，還剩 ${status.cooldownRemainSec} 秒`} />
      ) : (
        <Typography variant="caption" color="text.secondary">
          {status.lastRunAt ? `上次更新：${new Date(status.lastRunAt).toLocaleString('zh-TW')}` : '尚無爬取紀錄'}
        </Typography>
      )}
      {message && <Typography variant="caption" color="primary">{message}</Typography>}

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <div className="p-3 d-flex flex-column gap-2" style={{ minWidth: 380 }}>
          <Typography variant="subtitle2" fontWeight="bold">手動觸發爬蟲</Typography>
          <ToggleButtonGroup size="small" exclusive value={mode} onChange={(e, v) => v && setMode(v)}>
            <ToggleButton value="shift">依班別</ToggleButton>
            <ToggleButton value="custom">自訂時間</ToggleButton>
          </ToggleButtonGroup>

          {mode === 'shift' ? (
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <ToggleButtonGroup size="small" exclusive value={shiftType} onChange={(e, v) => v && setShiftType(v)}>
                <ToggleButton value="day">日班</ToggleButton>
                <ToggleButton value="night">夜班</ToggleButton>
              </ToggleButtonGroup>

              {shiftType === 'day' ? (
                <>
                  <Typography variant="body2">今天 {today}</Typography>
                  <select className="form-select form-select-sm" style={{ width: 'auto' }}
                    value={dayBeginHour} onChange={(e) => setDayBeginHour(Number(e.target.value))}>
                    {DAY_HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
                  </select>
                  <span>~</span>
                  <select className="form-select form-select-sm" style={{ width: 'auto' }}
                    value={dayEndHour} onChange={(e) => setDayEndHour(Number(e.target.value))}>
                    {DAY_HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
                  </select>
                </>
              ) : (
                <>
                  <Typography variant="body2">今天 {today}</Typography>
                  <select className="form-select form-select-sm" style={{ width: 'auto' }}
                    value={nightBeginHour} onChange={(e) => setNightBeginHour(Number(e.target.value))}>
                    {NIGHT_BEGIN_HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
                  </select>
                  <span>~</span>
                  <select className="form-select form-select-sm" style={{ width: 'auto' }}
                    value={nightEndDateOption} onChange={(e) => setNightEndDateOption(e.target.value)}>
                    <option value="today">今天({today})</option>
                    <option value="tomorrow">明天({tomorrow})</option>
                  </select>
                  <select className="form-select form-select-sm" style={{ width: 'auto' }}
                    value={nightEndHour} onChange={(e) => setNightEndHour(Number(e.target.value))}>
                    {(nightEndDateOption === 'today' ? NIGHT_END_HOURS_SAME_DAY : NIGHT_END_HOURS_NEXT_DAY)
                      .map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
                  </select>
                </>
              )}
              <Button variant="contained" size="small" disabled={disabled} onClick={handleShiftTrigger}>
                {status.running ? <CircularProgress size={14} /> : disabled ? `冷卻中(${status.cooldownRemainSec}s)` : '送出'}
              </Button>
            </div>
          ) : (
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <DatePicker label="起始日期" value={customBeginDate} onChange={setCustomBeginDate} format="YYYY-MM-DD"
                  slotProps={{ textField: { size: 'small', style: { width: 150 } } }} />
                <select className="form-select form-select-sm" style={{ width: 'auto' }}
                  value={customBeginHour} onChange={(e) => setCustomBeginHour(Number(e.target.value))}>
                  {HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
                </select>
                <span>~</span>
                <DatePicker label="結束日期" value={customEndDate} onChange={setCustomEndDate} format="YYYY-MM-DD"
                  slotProps={{ textField: { size: 'small', style: { width: 150 } } }} />
                <select className="form-select form-select-sm" style={{ width: 'auto' }}
                  value={customEndHour} onChange={(e) => setCustomEndHour(Number(e.target.value))}>
                  {HOURS.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
                </select>
                <Button variant="contained" size="small" disabled={disabled} onClick={handleCustomTrigger}>
                  {status.running ? <CircularProgress size={14} /> : disabled ? `冷卻中(${status.cooldownRemainSec}s)` : '送出'}
                </Button>
              </div>
            </LocalizationProvider>
          )}
        </div>
      </Popover>
    </div>
  );
};

export default EdcCrawlTriggerButton;
