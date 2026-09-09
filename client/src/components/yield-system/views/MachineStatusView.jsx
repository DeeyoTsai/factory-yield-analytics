import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_PREFIX } from '../../../config/api';
import { 
  Box, 
  Typography, 
  Button, 
  // ButtonGroup, 
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  // TextField,
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import GanttChart from '../components/GanttChart';
import StatusGanttChart from '../components/StatusGanttChart';

const MachineStatusView = () => {
  const [selectedDate, setSelectedDate] = useState(dayjs()); // Default to match known data
  const [lineFilter, setLineFilter] = useState('');
  const [eqData, setEqData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ganttTab, setGanttTab] = useState('schedule');

  const fetchEqActions = useCallback(async () => {
    setLoading(true);
    try {
      const prevDay = selectedDate.subtract(1, 'day').format('YYYY-MM-DD');
      const currDay = selectedDate.add(1, 'day').format('YYYY-MM-DD');
      const startend = `${prevDay} 07:00 - ${currDay} 07:00`;
      
      const userStr = localStorage.getItem('user');
      const token = userStr ? JSON.parse(userStr).token : '';

      const response = await axios.get(`${API_PREFIX}/eq-actions`, {
        headers: { Authorization: token },
        params: {
          startend: startend,
          line: lineFilter || undefined
        }
      });
      setEqData(response.data);
    } catch (error) {
      console.error('Error fetching eq actions:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, lineFilter]);

  useEffect(() => {
    fetchEqActions();
  }, [fetchEqActions]);

  const handleLineFilter = (line) => {
    setLineFilter(line);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight="bold">
            排程與機況履歷
          </Typography>
          <DatePicker
            label="請選擇日期..."
            value={selectedDate}
            onChange={(newValue) => setSelectedDate(newValue)}
            slotProps={{ textField: { variant: 'outlined' } }}
          />
        </Box>

        <Box sx={{ mb: 1 }}>
          <Button variant={ganttTab === 'schedule' ? 'contained' : 'outlined'} size="small" sx={{ mr: 1 }} onClick={() => setGanttTab('schedule')}>排程甘特圖</Button>
          <Button variant={ganttTab === 'status' ? 'contained' : 'outlined'} size="small" onClick={() => setGanttTab('status')}>機況甘特圖</Button>
        </Box>
        <Paper sx={{ p: 2, mb: 3 }}>
          {ganttTab === 'schedule' && <GanttChart data={eqData} date={selectedDate.toDate()} />}
          {ganttTab === 'status' && <StatusGanttChart data={eqData} date={selectedDate.toDate()} />}
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
            <Button variant={lineFilter === '' ? 'contained' : 'outlined'} color="secondary" onClick={() => handleLineFilter('')}>ALL</Button>
            <Button variant={lineFilter === 'L1' ? 'contained' : 'outlined'} color="error" onClick={() => handleLineFilter('L1')}>L1</Button>
            <Button variant={lineFilter === 'L2' ? 'contained' : 'outlined'} color="success" onClick={() => handleLineFilter('L2')}>L2</Button>
            <Button variant={lineFilter === 'L3' ? 'contained' : 'outlined'} color="info" onClick={() => handleLineFilter('L3')}>L3</Button>
            <Button variant={lineFilter === 'L4' ? 'contained' : 'outlined'} color="error" onClick={() => handleLineFilter('L4')}>L4</Button>
            <Button variant={lineFilter === 'L5' ? 'contained' : 'outlined'} color="success" onClick={() => handleLineFilter('L5')}>L5</Button>
            <Button variant={lineFilter === 'L6' ? 'contained' : 'outlined'} color="info" onClick={() => handleLineFilter('L6')}>L6</Button>
          </Box>

          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Line</TableCell>
                  <TableCell>EQ</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>敘述</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>LOT</TableCell>
                  <TableCell>處理人員</TableCell>
                  <TableCell>處置</TableCell>
                  <TableCell>開始時間</TableCell>
                  <TableCell>結束時間</TableCell>
                  <TableCell>時間</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {eqData.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.line}</TableCell>
                    <TableCell>{row.eq}</TableCell>
                    <TableCell>{row.code}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell>{row.description}</TableCell>
                    <TableCell>{row.product}</TableCell>
                    <TableCell>{row.lot}</TableCell>
                    <TableCell>{row.handler}</TableCell>
                    <TableCell>{row.action}</TableCell>
                    <TableCell>{row.begintime}</TableCell>
                    <TableCell>{row.endtime}</TableCell>
                    <TableCell>{row.period}</TableCell>
                  </TableRow>
                ))}
                {eqData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} align="center">
                      {loading ? '讀取中...' : '尚無資料'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

export default MachineStatusView;