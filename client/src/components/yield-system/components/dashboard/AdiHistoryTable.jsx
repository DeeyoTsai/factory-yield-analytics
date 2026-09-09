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
  // Typography
} from '@mui/material';

const AdiHistoryTable = ({ data }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const columns = ['BM1', 'BM2', 'L1', 'L4', 'L2', 'L5', 'L3', 'L6', 'AOI'];
  const keys = ['bm1', 'bm2', 'r1', 'r2', 'g1', 'g2', 'b1', 'b2', 'aoi'];

  const renderSubColumns = (value) => {
    if (!value) return (
      <>
        <TableCell align="center">-</TableCell>
        <TableCell align="center">-</TableCell>
        <TableCell align="center">-</TableCell>
      </>
    );
    
    const parts = value.toString().split(',');
    if (parts.length === 3) {
      const yValue = parseInt(parts[0], 10);
      return (
        <>
          <TableCell 
            align="center" 
            sx={{ 
              color: yValue > 0 ? 'error.main' : 'inherit',
              fontWeight: yValue > 0 ? 'bold' : 'normal',
              bgcolor: yValue > 0 ? '#f0c4c4':''
            }}
          >
            {parts[0]}
          </TableCell>
          <TableCell align="center">{parts[1]}</TableCell>
          <TableCell align="center">{parts[2]}</TableCell>
        </>
      );
    }
    
    return (
      <>
        <TableCell align="center">{value}</TableCell>
        <TableCell align="center">-</TableCell>
        <TableCell align="center">-</TableCell>
      </>
    );
  };

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 440 }}>
        <Table stickyHeader aria-label="adi history table" size="small">
          <TableHead>
            <TableRow>
              <TableCell rowSpan={2} sx={{ fontWeight: 'bold', zIndex: 1100 }}>Glass ID</TableCell>
              {columns.map((col) => (
                <TableCell key={col} align="center" colSpan={3} sx={{ fontWeight: 'bold' }}>
                  {col}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              {columns.map((col) => (
                <React.Fragment key={`${col}-sub`}>
                  <TableCell align="center" sx={{ fontWeight: 'bold', color: 'error.main'  }}>Y</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', color: 'primary.main' }}>N</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>ALL</TableCell>
                </React.Fragment>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data && data.length > 0 ? (
              data
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((glass) => {
                  const adi = glass.adirecord || {};
                  return (
                    <TableRow hover role="checkbox" tabIndex={-1} key={glass.id}>
                      <TableCell>{glass.gid}</TableCell>
                      {keys.map((key) => (
                        <React.Fragment key={key}>
                          {renderSubColumns(adi[key])}
                        </React.Fragment>
                      ))}
                    </TableRow>
                  );
                })
            ) : (
              <TableRow>
                <TableCell colSpan={28} align="center">No ADI history available</TableCell>
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
    </Paper>
  );
};

export default AdiHistoryTable;
