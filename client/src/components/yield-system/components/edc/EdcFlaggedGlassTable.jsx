import React, { useState, useEffect } from 'react';
import {
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Checkbox, TextField, IconButton, Tooltip,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';

// 異常基板清單：可勾選「已確認」+ 填 comment，逐列儲存（PUT /api/edc/comment）。
// 比照 DragDropImageTable 的 value/onChange 上拋模式：本地 draft 先持有編輯中的值，
// 存檔後父層重新整理 flaggedGlass（帶回最新 confirmed/comment），draft 隨之同步。
const EdcFlaggedGlassTable = ({ flaggedGlass, onSave }) => {
  const [drafts, setDrafts] = useState({});
  const [savingKey, setSavingKey] = useState(null);

  // 同一片 glass 可能因不同欄位（如 Shot1_FRX、Shot1_FRY）各自超規格而出現多列，
  // 用 glass_id+column_name 複合鍵才能區分每一列各自的 comment/confirmed 狀態
  const rowKey = (row) => `${row.glass_id}|${row.column_name}`;

  // 父層重新抓 flaggedGlass（切換群組、或爬蟲跑完自動刷新）時，用伺服器最新值重建本地 draft，
  // 避免殘留上一個群組的編輯中內容
  useEffect(() => {
    const next = {};
    for (const row of flaggedGlass) {
      next[rowKey(row)] = { confirmed: !!row.confirmed, comment: row.comment || '' };
    }
    setDrafts(next);
  }, [flaggedGlass]);

  // 使用者打勾/打字時只更新本地 draft，不會立即送出，要按下儲存按鈕才 PUT 回後端
  const updateDraft = (key, patch) => {
    setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  // savingKey 只記錄「目前正在儲存的那一列」，讓其他列的儲存按鈕不受影響（逐列獨立儲存，非整批送出）
  const handleSave = async (row) => {
    const key = rowKey(row);
    setSavingKey(key);
    try {
      await onSave(row, drafts[key]);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <Paper sx={{ p: 1 }}>
      <Typography variant="h6" align="center" sx={{ fontWeight: 'bold' }}>異常基板</Typography>
      <TableContainer sx={{ maxHeight: 480 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {['已確認', '生產時間', 'Glass ID', '產線/機台', '品種', '異常欄位', '數值', 'Side', '備註', ''].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 'bold' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {flaggedGlass.length ? flaggedGlass.map((row) => {
              const key = rowKey(row);
              const draft = drafts[key] || { confirmed: false, comment: '' };
              return (
                <TableRow hover key={`${row.id}`}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={draft.confirmed}
                      onChange={(e) => updateDraft(key, { confirmed: e.target.checked })} />
                  </TableCell>
                  <TableCell>{row.event_datetime}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{row.glass_id}</TableCell>
                  <TableCell>{row.station}/{row.machine}</TableCell>
                  <TableCell>{row.recipe}</TableCell>
                  <TableCell>{row.column_name}</TableCell>
                  <TableCell>{row.value}</TableCell>
                  <TableCell>{row.side}</TableCell>
                  <TableCell>
                    <TextField size="small" variant="standard" fullWidth placeholder="下 comment..."
                      value={draft.comment}
                      onChange={(e) => updateDraft(key, { comment: e.target.value })} />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="儲存">
                      <span>
                        <IconButton size="small" color="primary" disabled={savingKey === key}
                          onClick={() => handleSave(row)}>
                          <SaveIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow><TableCell colSpan={10} align="center">此段無異常基板</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default EdcFlaggedGlassTable;
