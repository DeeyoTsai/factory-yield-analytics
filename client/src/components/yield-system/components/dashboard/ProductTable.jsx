import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Typography
} from '@mui/material';

const ProductTable = ({ data, selectedProducts = [], onToggle }) => {
  return (
    <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 300 }}>
      <Table stickyHeader size="small" aria-label="product table">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>Phase</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Product</TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Qty</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data && data.length > 0 ? (
            data.map((row) => {
              const isSelected = selectedProducts.includes(row.product);
              return (
                <TableRow
                  key={row.id}
                  hover
                  onClick={() => { if (window.getSelection().toString()) return; onToggle(row.product); }}
                  selected={isSelected}
                  sx={{ 
                    cursor: 'pointer',
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(25, 118, 210, 0.16) !important',
                    },
                    '&.Mui-selected:hover': {
                      backgroundColor: 'rgba(25, 118, 210, 0.24) !important',
                    },
                    '&:last-child td, &:last-child th': { border: 0 } 
                  }}
                >
                  <TableCell component="th" scope="row">
                    {row.phase || '-'}
                  </TableCell>
                  <TableCell>{row.product}</TableCell>
                  <TableCell align="right">{row.qty}</TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={3} align="center">
                No product data available
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ProductTable;
