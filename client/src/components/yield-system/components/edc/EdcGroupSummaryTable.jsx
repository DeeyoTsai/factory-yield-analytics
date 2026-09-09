import React from 'react';
import {
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
} from '@mui/material';

// 燈號：overSpec=false 綠燈(<4)、true 紅燈(>=4)
const RangeLight = ({ maxRange, overSpec }) => (
  <Chip
    size="small"
    label={`${maxRange?.toFixed?.(2) ?? maxRange}`}
    sx={{ fontWeight: 'bold', color: '#fff', backgroundColor: overSpec ? '#dc2626' : '#16a34a' }}
  />
);

const SHIFT_LABEL = { day: '日班', night: '夜班', custom: '自訂查詢' };
const ShiftTag = ({ shift, windowStart, windowEnd }) => (
  <Chip
    size="small" variant="outlined"
    label={shift === 'custom' && windowStart ? `自訂 ${windowStart}~${windowEnd}` : (SHIFT_LABEL[shift] || shift)}
  />
);

// 第 1 層：站別A~站別F by 品種+班別 彙總，比照原 Excel「匯集」分頁——只列最大全距+燈號，
// 不逐段列出（多個 relogin 造成的段落已在後端合併成一列），點列再看該群組的異常明細（by shot）。
// 同一天可能同時有日班/夜班/自訂查詢三種列（各自獨立的 EdcRecord），故加「班別」欄位區分。
// props：groups＝GET /api/edc/summary 回傳的彙總列（已依站別/品種/班別分好組）；
//        selectedKey＝目前選取列的 groupKey（`站別|品種|shift`），用來高亮該列；
//        onSelectGroup(group)＝點列時通知父層（EdcRangeView.jsx）去抓第2層明細。
const EdcGroupSummaryTable = ({ groups, selectedKey, onSelectGroup }) => (
  <Paper sx={{ p: 1 }}>
    <TableContainer sx={{ maxHeight: 480 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            {['站別', '品種', '班別', '時間範圍', '分段數', 'Glass數', '最大全距', '超規格欄位'].map((h) => (
              <TableCell key={h} sx={{ fontWeight: 'bold' }}>{h}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {groups.length ? groups.map((g) => {
            // key 要帶 shift，否則同一天日班/夜班/自訂查詢三列會被誤判成同一列，選取狀態互相蓋掉
            const key = `${g.station}|${g.recipe}|${g.shift}`;
            return (
              <TableRow hover key={key} selected={selectedKey === key}
                onClick={() => onSelectGroup(g)} sx={{ cursor: 'pointer' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>{g.station}</TableCell>
                <TableCell>{g.recipe}</TableCell>
                <TableCell><ShiftTag shift={g.shift} windowStart={g.windowStart} windowEnd={g.windowEnd} /></TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{g.eventStart} ~ {g.eventEnd}</TableCell>
                <TableCell>{g.segmentCount}</TableCell>
                <TableCell>{g.glassCount}</TableCell>
                <TableCell><RangeLight maxRange={g.maxRange} overSpec={g.overSpec} /></TableCell>
                {/* 只有超規格（全距>=4，即紅燈）才顯示，且列出「全部」超規格欄位而非只有全距
                    最大的那一個——整片基板歪掉時常常好幾個角點一起爆（例如 FRY/FLY/RLY/RRY）。
                    後端已依嚴重度（全距大→小）排好序，這裡照順序顯示、最嚴重的在最前面。
                    綠燈時 maxRangeColumn 也有值（語意是「全距最大的欄位」，不代表異常），一律顯示 '-'。 */}
                <TableCell sx={{ whiteSpace: 'normal', lineHeight: 1.9 }}>
                  {g.overSpec && g.overSpecColumns?.length
                    ? g.overSpecColumns.map((col) => (
                      <Chip key={col} label={col} size="small"
                        sx={{ mr: 0.5, mb: 0.25, backgroundColor: '#fee2e2', color: '#991b1b', fontSize: '0.7rem' }} />
                    ))
                    : '-'}
                </TableCell>
              </TableRow>
            );
          }) : (
            <TableRow><TableCell colSpan={8} align="center">該日期無 EDC 資料</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  </Paper>
);

export default EdcGroupSummaryTable;
