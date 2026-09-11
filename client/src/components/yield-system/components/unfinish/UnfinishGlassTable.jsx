import React, { useState } from 'react';
import {
  Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogContent, Typography, Checkbox,
} from '@mui/material';
// 原本檔內自有的 Thumb 已抽成共用元件（daily 的 GlassTable 也要用同一個）。
// 未結批的 img_url_1/2 本來就是來源系統直連 URL，不需要 resolveDefectImgSrc() 正規化。
import DefectThumb from '../DefectThumb';

// 受控選取模式（同 dashboard/GlassTable）：checkbox 欄 + 表頭全選 + 點列切換，
// 選取結果由父層持有，供 Defect Map / ADI History 連動
const UnfinishGlassTable = ({ details, selectedIds = [], onSelectionChange }) => {
  const [zoomSrc, setZoomSrc] = useState(null);

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      onSelectionChange(details.map((r) => r.id));
      return;
    }
    onSelectionChange([]);
  };

  const handleToggle = (id) => {
    const newSelected = selectedIds.includes(id)
      ? selectedIds.filter((s) => s !== id)
      : [...selectedIds, id];
    onSelectionChange(newSelected);
  };

  const isSelected = (id) => selectedIds.includes(id);

  return (
    <Paper sx={{ p: 1 }}>
      <Typography variant="h6" align="center" sx={{ fontWeight: 'bold' }}>Glass Details</Typography>
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  color="primary"
                  indeterminate={selectedIds.length > 0 && selectedIds.length < details.length}
                  checked={details.length > 0 && selectedIds.length === details.length}
                  onChange={handleSelectAllClick}
                  inputProps={{ 'aria-label': 'select all glass' }}
                />
              </TableCell>
              {['Glass ID', '面付', 'X', 'Y', '檢驗時間', 'ADI入檢站別', '第一檢出站', '照片1', '照片2'].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 'bold' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {details.length ? details.map((r) => {
              const isItemSelected = isSelected(r.id);
              return (
                <TableRow hover role="checkbox" tabIndex={-1} key={r.id}
                  selected={isItemSelected}
                  onClick={() => { if (window.getSelection().toString()) return; handleToggle(r.id); }}
                  sx={{ cursor: 'pointer' }}>
                  <TableCell padding="checkbox">
                    <Checkbox color="primary" checked={isItemSelected}
                      inputProps={{ 'aria-labelledby': `unfinish-glass-checkbox-${r.id}` }} />
                  </TableCell>
                  <TableCell>{r.glassid}</TableCell>
                  <TableCell>{r.p_no}</TableCell>
                  <TableCell>{r.x}</TableCell>
                  <TableCell>{r.y}</TableCell>
                  <TableCell>{r.tedt}</TableCell>
                  <TableCell>{r.inspectstops || '-'}</TableCell>
                  <TableCell>{r.firststop || '-'}</TableCell>
                  <TableCell><DefectThumb src={r.img_url_1} onZoom={setZoomSrc} /></TableCell>
                  <TableCell><DefectThumb src={r.img_url_2} onZoom={setZoomSrc} /></TableCell>
                </TableRow>
              );
            }) : (
              <TableRow><TableCell colSpan={10} align="center">無明細資料</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 點縮圖放大 */}
      <Dialog open={!!zoomSrc} onClose={() => setZoomSrc(null)} maxWidth="lg">
        <DialogContent sx={{ p: 0 }}>
          {zoomSrc && <img src={zoomSrc} alt="defect-zoom" style={{ maxWidth: '100%', display: 'block' }} />}
        </DialogContent>
      </Dialog>
    </Paper>
  );
};

export default UnfinishGlassTable;
