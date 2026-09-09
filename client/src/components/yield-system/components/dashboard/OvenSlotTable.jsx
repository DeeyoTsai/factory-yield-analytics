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

function toLocalTime(dt){
  return new Date(dt).toLocaleString()
}

const OvenSlotTable = ({ data }) => {
  // Filter out entries that don't have ovenslot data
  const validData = data.filter(item => item.ovenslot);
  // console.log(validData);
  
  return (
    <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell>Date Time</TableCell>
            <TableCell>Glass ID</TableCell>
            <TableCell>SGRID</TableCell>
            <TableCell>Eqpt ID</TableCell>
            <TableCell>CST/Slot</TableCell>
            {/* <TableCell align="right">Slot No</TableCell> */}
            <TableCell align="right">Cure Pos</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {validData.length > 0 ? (
            validData.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{toLocalTime(row.ovenslot.dt) }</TableCell>
                <TableCell>{row.gid}</TableCell>
                <TableCell>{row.ovenslot.sgrid}</TableCell>
                <TableCell>{row.ovenslot.eqpt_id}</TableCell>
                <TableCell>{row.ovenslot.cst}/{row.ovenslot.slotno}</TableCell>
                {/* <TableCell align="right">{row.ovenslot.slotno}</TableCell> */}
                <TableCell align="right">{row.ovenslot.cure_pos}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} align="center">No Oven Slot Data</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default OvenSlotTable;
