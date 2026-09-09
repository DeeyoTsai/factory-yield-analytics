import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  TablePagination,
  Checkbox,
  Dialog,
  DialogContent
} from '@mui/material';
import DefectThumb from '../DefectThumb';
import { resolveDefectImgSrc } from '../../utils/defectImgSrc';

const GlassTable = ({ data, selectedIds = [], onSelectionChange }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [zoomSrc, setZoomSrc] = useState(null);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelecteds = data.map((n) => n.id);
      onSelectionChange(newSelecteds);
      return;
    }
    onSelectionChange([]);
  };

  const handleClick = (event, id) => {
    const selectedIndex = selectedIds.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectedIds, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectedIds.slice(1));
    } else if (selectedIndex === selectedIds.length - 1) {
      newSelected = newSelected.concat(selectedIds.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectedIds.slice(0, selectedIndex),
        selectedIds.slice(selectedIndex + 1),
      );
    }
    onSelectionChange(newSelected);
  };

  const isSelected = (id) => selectedIds.indexOf(id) !== -1;
  
  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      {/* 縮圖 60px × 每頁 10 列，440 會擠掉大半 → 放寬到 600（同 UnfinishGlassTable） */}
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader aria-label="glass info table" size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  color="primary"
                  indeterminate={selectedIds.length > 0 && selectedIds.length < data.length}
                  checked={data.length > 0 && selectedIds.length === data.length}
                  onChange={handleSelectAllClick}
                  inputProps={{ 'aria-label': 'select all glass' }}
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Product</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Defect Code</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Glass ID</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Position X</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Position Y</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>有進的ADI</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>檢出第一站</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>週別</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>月份</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>照片1</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>照片2</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data && data.length > 0 ? (
              data
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row) => {
                  const isItemSelected = isSelected(row.id);
                  return (
                    <TableRow 
                      hover 
                      role="checkbox" 
                      tabIndex={-1} 
                      key={row.id}
                      selected={isItemSelected}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          color="primary"
                          checked={isItemSelected}
                          onClick={(event) => handleClick(event, row.id)}
                          inputProps={{ 'aria-labelledby': `enhanced-table-checkbox-${row.id}` }}
                        />
                      </TableCell>
                      <TableCell>{row.pdamtable?.product || '-'}</TableCell>
                      <TableCell>{row.dfcode || '-'}</TableCell>
                      <TableCell>{row.gid}</TableCell>
                      <TableCell>{row.xpos}</TableCell>
                      <TableCell>{row.ypos}</TableCell>
                      <TableCell>{row.inspectstops || '-'}</TableCell>
                      <TableCell>{row.firststop || '-'}</TableCell>
                      <TableCell>{row.week || '-'}</TableCell>
                      <TableCell>{row.month || '-'}</TableCell>
                      <TableCell><DefectThumb src={resolveDefectImgSrc(row.img)} onZoom={setZoomSrc} /></TableCell>
                      <TableCell><DefectThumb src={resolveDefectImgSrc(row.img2)} onZoom={setZoomSrc} /></TableCell>
                    </TableRow>
                  );
                })
            ) : (
              <TableRow>
                <TableCell colSpan={11} align="center">No glass data available</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 100]}
        component="div"
        count={data ? data.length : 0}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
      {/* 點縮圖放大 */}
      <Dialog open={!!zoomSrc} onClose={() => setZoomSrc(null)} maxWidth="lg">
        <DialogContent sx={{ p: 0 }}>
          {zoomSrc && <img src={zoomSrc} alt="defect-zoom" style={{ maxWidth: '100%', display: 'block' }} />}
        </DialogContent>
      </Dialog>
    </Paper>
  );
};

export default GlassTable;
