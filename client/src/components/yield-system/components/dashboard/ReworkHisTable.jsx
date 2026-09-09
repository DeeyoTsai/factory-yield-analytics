import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Paper
} from '@mui/material';

const ReworkHisTable = ({ data }) => {
  // Filter out entries that don't have rework history data
  const validData = data.filter(item => item.reworkhis);

  return (
    <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell>Glass ID</TableCell>
            <TableCell align="center">BM1</TableCell>
            <TableCell align="center">BM2</TableCell>
            <TableCell align="center">L1</TableCell>
            <TableCell align="center">L4</TableCell>
            <TableCell align="center">L2</TableCell>
            <TableCell align="center">L5</TableCell>
            <TableCell align="center">L3</TableCell>
            <TableCell align="center">L6</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {validData.length > 0 ? (
            validData.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.gid}</TableCell>
                <TableCell 
                  align="center"
                  sx={{
                    color: row.reworkhis.bm1 > 1 ? 'error.main' : 'inherit',
                    fontWeight: row.reworkhis.bm1 > 1 ? 'bold' : 'normal',
                    bgcolor:  row.reworkhis.bm1 > 1 ? '#f0c4c4':''
                  }}
                >
                  {row.reworkhis.bm1}
                </TableCell>
                <TableCell 
                  align="center"
                  sx={{
                    color: row.reworkhis.bm2 > 1 ? 'error.main' : 'inherit',
                    fontWeight: row.reworkhis.bm2 > 1 ? 'bold' : 'normal',
                    bgcolor:  row.reworkhis.bm2 > 1 ? '#f0c4c4':''
                  }}
                >
                  {row.reworkhis.bm2}
                </TableCell>
                <TableCell 
                  align="center"
                  sx={{
                    color: row.reworkhis.r1 > 1 ? 'error.main' : 'inherit',
                    fontWeight: row.reworkhis.r1 > 1 ? 'bold' : 'normal',
                    bgcolor:  row.reworkhis.r1 > 1 ? '#f0c4c4':''
                  }}
                >
                  {row.reworkhis.r1}
                </TableCell>
                <TableCell 
                  align="center"
                  sx={{
                    color: row.reworkhis.r2 > 1 ? 'error.main' : 'inherit',
                    fontWeight: row.reworkhis.r2 > 1 ? 'bold' : 'normal',
                    bgcolor:  row.reworkhis.r2 > 1 ? '#f0c4c4':''
                  }}
                >
                  {row.reworkhis.r2}
                </TableCell>
                <TableCell 
                  align="center"
                  sx={{
                    color: row.reworkhis.g1 > 1 ? 'error.main' : 'inherit',
                    fontWeight: row.reworkhis.g1 > 1 ? 'bold' : 'normal',
                    bgcolor:  row.reworkhis.g1 > 1 ? '#f0c4c4':''
                  }}
                >
                  {row.reworkhis.g1}
                </TableCell>
                <TableCell 
                  align="center"
                  sx={{
                    color: row.reworkhis.g2 > 1 ? 'error.main' : 'inherit',
                    fontWeight: row.reworkhis.g2 > 1 ? 'bold' : 'normal',
                    bgcolor:  row.reworkhis.g2 > 1 ? '#f0c4c4':''
                  }}
                >
                  {row.reworkhis.g2}
                </TableCell>
                <TableCell 
                  align="center"
                  sx={{
                    color: row.reworkhis.b1 > 1 ? 'error.main' : 'inherit',
                    fontWeight: row.reworkhis.b1 > 1 ? 'bold' : 'normal',
                    bgcolor:  row.reworkhis.b1 > 1 ? '#f0c4c4':''
                  }}
                >
                  {row.reworkhis.b1}
                </TableCell>
                <TableCell 
                  align="center"
                  sx={{
                    color: row.reworkhis.b2 > 1 ? 'error.main' : 'inherit',
                    fontWeight: row.reworkhis.b2 > 1 ? 'bold' : 'normal',
                    bgcolor:  row.reworkhis.b2 > 1 ? '#f0c4c4':''
                  }}
                >
                  {row.reworkhis.b2}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={9} align="center">No Rework History</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ReworkHisTable;
