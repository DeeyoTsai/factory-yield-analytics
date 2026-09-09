import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_PREFIX } from '../../../config/api';
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

const EqActionList = () => {
  const [actions, setActions] = useState([]);

  useEffect(() => {
    const fetchActions = async () => {
      try {
        const userStr = localStorage.getItem('user');
        const token = userStr ? JSON.parse(userStr).token : '';
        const response = await axios.get(`${API_PREFIX}/eq-actions`, {
          headers: { Authorization: token }
        });
        setActions(response.data);
      } catch (error) {
        console.error('Error fetching eq actions:', error);
      }
    };

    fetchActions();
  }, []);

  return (
    <div>
      <Typography variant="h4" gutterBottom>
        Eq Actions
      </Typography>
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>Line</TableCell>
              <TableCell>EQ</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Begin Time</TableCell>
              <TableCell>End Time</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {actions.map((action) => (
              <TableRow key={action.id}>
                <TableCell>{action.line}</TableCell>
                <TableCell>{action.eq}</TableCell>
                <TableCell>{action.code}</TableCell>
                <TableCell>{action.status}</TableCell>
                <TableCell>{action.product}</TableCell>
                <TableCell>{action.begintime}</TableCell>
                <TableCell>{action.endtime}</TableCell>
              </TableRow>
            ))}
            {actions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">No data available</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default EqActionList;
