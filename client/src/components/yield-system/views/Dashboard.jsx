// -- Active: 1773212524322@@127.0.0.1@3306
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../../config/api';
import dayjs from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { 
  // Grid, 
  // Paper, 
  // Typography, 
  // Table, 
  // TableBody, 
  // TableCell, 
  // TableContainer, 
  // TableHead, 
  // TableRow,
  // Box,
  CircularProgress
} from '@mui/material';
import DefectScatterChart from '../components/dashboard/DefectScatterChart';
import ProductTable from '../components/dashboard/ProductTable';
import GlassTable from '../components/dashboard/GlassTable';
// import AdiBarChart from '../components/dashboard/AdiBarChart';
import AdiHistoryTable from '../components/dashboard/AdiHistoryTable';
import OvenSlotTable from '../components/dashboard/OvenSlotTable';
import ReworkHisTable from '../components/dashboard/ReworkHisTable';
import DefectStationProfile from '../components/dashboard/DefectStationProfile';
import TrendChartTabs from '../components/dashboard/TrendChartTabs';
import OvenSlotChart from '../components/dashboard/OvenSlotChart';



const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [allTopFive, setAllTopFive] = useState([]);
  const [rgbTopFive, setRgbTopFive] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRgbRow, setSelectedRgbRow] = useState(null);
  const [glassInfoData, setGlassInfoData] = useState([]);
  const [productData, setProductData] = useState([]);
  // 趨勢圖實際查詢的站別/機台。同一 defect 若兩條線（phase 1/2）都有發生會是兩筆，
  // 供 DefectStationProfile 比對，也決定「集中趨勢圖」卡片要渲染幾張圖。
  const [trendMetas, setTrendMetas] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [selectedGlassIds, setSelectedGlassIds] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  // （原本的 hasTrendChartData state 已移除：趨勢圖顯示與否改由 trendMetas.length 決定）

  const fetchData = async (date) => {
    if (!date) return;
    setLoading(true);
    // Clear details when date changes
    setSelectedRgbRow(null);
    setGlassInfoData([]);
    setProductData([]);
    setTrendMetas([]);
    setSelectedProducts([]);
    
    const nowHour = new Date().getHours();
    const shiftDay = (nowHour < 12 ) ? 1 : 0; 
    // const formattedDate = date.format('YYYY-MM-DD');
    const topFivedDate = date.format('YYYY-MM-DD');
    const rgbTopFiveDate = date.subtract(shiftDay, 'day').format('YYYY-MM-DD');

    try {
      const userStr = localStorage.getItem('user');
      const token = userStr ? JSON.parse(userStr).token : '';
      const config = { headers: { Authorization: token } };

      const [allRes, rgbRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/topFive?day=${topFivedDate}`, config),
        axios.get(`${API_BASE_URL}/api/rgbtopfive?day=${rgbTopFiveDate}`, config)
      ]);
      setAllTopFive(allRes.data.results || []);
      setRgbTopFive(rgbRes.data.results || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setAllTopFive([]);
      setRgbTopFive([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate]);

  const handleRgbRowClick = async (row) => {
    if (selectedRgbRow?.id === row.id) return; // Do nothing if clicking same row
    
    setSelectedRgbRow(row);
    setDetailsLoading(true);
    try {
      const userStr = localStorage.getItem('user');
      const token = userStr ? JSON.parse(userStr).token : '';
      const config = { headers: { Authorization: token } };

      const [glassRes, pdamRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/glass-info/by-rgb/${row.id}`, config),
        axios.get(`${API_BASE_URL}/api/pdamtable/by-rgb/${row.id}`, config)
      ]);
      const glassResults = glassRes.data.results || [];
      const productResults = pdamRes.data.results || [];
      // console.log(glassResults);
      
      setGlassInfoData(glassResults);
      setSelectedGlassIds(glassResults.map(item => item.id));
      
      setProductData(productResults);
      // Default select all products
      setSelectedProducts(productResults.map(p => p.product));
      
      // 集中趨勢圖實際查詢的站別/機台（爬蟲寫進 TrendChart 的 process/tool_id），
      // 給 DefectStationProfile 拿去跟「實際哪一站檢出最多」對照
      setTrendMetas(glassRes.data.trendMetas || []);

    } catch (error) {
      console.error('Error fetching details:', error);
      setGlassInfoData([]);
      setProductData([]);
      setTrendMetas([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleProductToggle = (productName) => {
    const isCurrentlySelected = selectedProducts.includes(productName);
    let newSelectedProducts;
    
    if (isCurrentlySelected) {
      newSelectedProducts = selectedProducts.filter(p => p !== productName);
    } else {
      newSelectedProducts = [...selectedProducts, productName];
    }
    setSelectedProducts(newSelectedProducts);

    // Sync with Glass Table
    const glassIdsForProduct = glassInfoData
      .filter(g => g.pdamtable?.product === productName)
      .map(g => g.id);

    setSelectedGlassIds(prevGlassIds => {
      if (isCurrentlySelected) {
        // Deselecting product -> Remove these IDs
        return prevGlassIds.filter(id => !glassIdsForProduct.includes(id));
      } else {
        // Selecting product -> Add these IDs (deduplicate)
        return [...new Set([...prevGlassIds, ...glassIdsForProduct])];
      }
    });
  };

  const formatRatio = (ratio) => {
    return ratio.toFixed(2) + ' %';
  };

  const filteredGlassData = glassInfoData.filter(item => selectedGlassIds.includes(item.id));
  // console.log(glassInfoData);
  
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <div className="container-fluid py-4" style={{ padding: '0 2.5rem' }}>
        {/* Header Section */}
        <div className="d-flex justify-content-between align-items-center mb-4 mt-3">
          <h2 className="mb-0 fw-bold">工廠 Daily Yield</h2>
          <div style={{ width: '300px' }}>
            <DatePicker
              label="Select Date"
              value={selectedDate}
              onChange={(newValue) => setSelectedDate(newValue)}
              format="YYYY-MM-DD"
              slotProps={{ textField: { fullWidth: true, size: 'small' } }}
            />
          </div>
        </div>

        {/* Tables Section */}
        <div className="row g-4 mb-5">
          {/* All Top 5 Table */}
          <div className="col-12 col-md-6">
            <div className="card h-100 shadow-sm border-0">
              <div className="card-header border-0 py-3" style={{ backgroundColor: '#a7f3d0' }}>
                <h5 className="mb-0">當日前五大 (All Top 5)</h5>
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="d-flex justify-content-center p-5">
                    <CircularProgress />
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover table-sm">
                      <thead className="table-light">
                        <tr>
                          <th>Defect Code</th>
                          <th className="text-end">Qty</th>
                          <th className="text-end">Ratio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allTopFive.length > 0 ? (
                          allTopFive.map((row) => (
                            <tr key={row.id}>
                              <td>{row.dfcode}</td>
                              <td className="text-end">{row.quantity}</td>
                              <td className="text-end">{row.ratio ? formatRatio(row.ratio) : 'N/A'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="text-center text-muted py-4">No Data</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RGB Top 5 Table */}
          <div className="col-12 col-md-6">
            <div className="card h-100 shadow-sm border-0">
              <div className="card-header border-0 py-3" style={{ backgroundColor: '#a7f3d0' }}>
                <h5 className="mb-0">RGB良率日報 (RGB Top 5)</h5>
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="d-flex justify-content-center p-5">
                    <CircularProgress />
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover table-sm">
                      <thead className="table-light">
                        <tr>
                          <th>Defect Code</th>
                          <th className="text-end">Qty</th>
                          <th className="text-end">Ratio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rgbTopFive.length > 0 ? (
                          rgbTopFive.map((row) => (
                            <tr
                              key={row.id}
                              onClick={() => { if (window.getSelection().toString()) return; handleRgbRowClick(row); }}
                              className={selectedRgbRow?.id === row.id ? 'table-primary shadow-sm' : ''}
                              style={{ cursor: 'pointer' }}
                            >
                              <td>{row.dfcode}</td>
                              <td className="text-end">{row.quantity}</td>
                              <td className="text-end">{row.ratio ? formatRatio(row.ratio) : 'N/A'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="text-center text-muted py-4">No Data</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* 沒有glass 資料時顯示文字 */}
        {
          selectedRgbRow && glassInfoData.length===0 && (
            <div className="alert alert-danger" style={{ textAlign: 'center' }}>
              <h3>&lt;良率資料爬取條件&gt;</h3>
              <ul style={{ textAlign: 'left', display: 'inline-block', margin: '0 auto' }}>
                <li>1. Defect Qty 數量 &gt; 3</li>
                <li>
                  2. Defect Code 不包含下列字元:
                  <ul>
                    <li> • ['T刮傷', 'L刮傷', 'T拖拉', '過磨', 'C刮傷', 'repair', 'Repair', 'BM']</li>
                  </ul>
                </li>
                <li>
                  3. Trend Chart 只會選 Defect 多的 phase 查詢，tool 選擇條件如下:
                  <ul>
                    <li> • Defect Code 包含: ['刮傷', '液滴', '殘膠'] → "OVN"</li>
                    <li> • Defect Code 包含: ['髒汙', '膜上'] → "DEV"</li>
                    <li> • 其餘預設須選 "CTR"</li>
                  </ul>
                </li>
                <li>4. 每天上午7:30、下午4:00 & 7:00會自動拉良率&分析。過中午12點，RGB良率要選擇前一天，才看的到早上拉的良率</li>
              </ul>
            </div>
          )
        }
        {/* Details Section */}
        { selectedRgbRow && glassInfoData.length>0 && (
          <div className="mt-5">
            <div className="mb-4">
               <h3 className="fw-bold text-primary">Details: {selectedRgbRow.dfcode}</h3>
            </div>

            {detailsLoading ? (
               <div className="d-flex justify-content-center p-5">
                 <CircularProgress />
               </div>
            ) : (
              <div className="row g-4">
                {/* Left Column: Defect Map */}
                <div className="col-12 col-md-6">
                  <div className="card shadow-sm border-0" style={{ height: '730px' }}>
                    <div className="card-header bg-white py-3">
                      <h5 className="mb-0">Defect Map</h5>
                    </div>
                    <div className="card-body p-0">
                      <div className="h-100 w-100">
                        <DefectScatterChart data={filteredGlassData} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Product Info + 站別檢出分布 上下堆疊，h-100 跟左邊 Defect Map 等高 */}
                <div className="col-12 col-md-6">
                  <div className="d-flex flex-column h-100" style={{ gap: '1.5rem', maxHeight: '750px' }}>
                    {/* Product Info - 30% Height */}
                    <div className="card shadow-sm border-0" style={{ flex: 3, overflow: 'hidden' }}>
                      <div className="card-header bg-white py-3">
                        <h5 className="mb-0">Product Info</h5>
                      </div>
                      <div className="card-body overflow-auto">
                        <ProductTable 
                          data={productData} 
                          selectedProducts={selectedProducts}
                          onToggle={handleProductToggle}
                        />
                        {/* <TrendCharts pdamData={productData} /> */}
                      </div>
                    </div>

                    {/* 站別檢出分布 - 70% Height（原 Defect Images；照片已內嵌進 Glass Details 表格。
                        ImageGallery.jsx 保留未刪，只是不再掛在這裡） */}
                    <div className="card shadow-sm border-0" style={{ flex: 7, overflow: 'hidden' }}>
                      <div className="card-header bg-white py-3">
                        <h5 className="mb-0">站別檢出分布</h5>
                      </div>
                      <div className="card-body overflow-auto">
                        <DefectStationProfile
                          glassData={filteredGlassData}
                          trendMetas={trendMetas}
                          totalCount={glassInfoData.length}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Glass Info Table - Full Width */}
                <div className="col-12">
                  <div className="card shadow-sm border-0">
                    <div className="card-header bg-white py-3">
                      <h5 className="mb-0">Glass Details</h5>
                    </div>
                    <div className="card-body">
                      <GlassTable 
                        data={glassInfoData} 
                        selectedIds={selectedGlassIds}
                        onSelectionChange={setSelectedGlassIds}
                      />
                    </div>
                  </div>
                </div>

                {/* ADI History Table - Full Width */}
                <div className="col-12">
                  <div className="card shadow-sm border-0">
                    <div className="card-header bg-white py-3">
                      <h5 className="mb-0">ADI History</h5>
                    </div>
                    <div className="card-body">
                      <AdiHistoryTable data={filteredGlassData} />
                    </div>
                  </div>
                </div>

                {/* Rework History Table */}
                <div className="col-12 col-md-6">
                  <div className="card shadow-sm border-0 h-100">
                    <div className="card-header bg-white py-3">
                      <h5 className="mb-0">Rework History</h5>
                    </div>
                    <div className="card-body">
                      <ReworkHisTable data={filteredGlassData} />
                    </div>
                  </div>
                </div>

                {/* 集中趨勢圖：擺在 Rework History 右邊。內容用分頁籤（TrendChartTabs），
                    卡片高度才不會因為兩條 line 而變兩倍高、跟左邊那張對不齊。 */}
                <div className="col-12 col-md-6">
                  <div className="card shadow-sm border-0 h-100">
                    <div className="card-header bg-white py-3">
                      <h5 className="mb-0">集中趨勢圖</h5>
                    </div>
                    <div className="card-body">
                      <TrendChartTabs trendMetas={trendMetas} />
                    </div>
                  </div>
                </div>

                {/* Oven Slot Table */}
                <div className="col-12 col-md-6">
                  <div className="card shadow-sm border-0 h-100">
                    <div className="card-header bg-white py-3">
                      <h5 className="mb-0">Oven Slot Info</h5>
                    </div>
                    <div className="card-body">
                      <OvenSlotTable data={filteredGlassData} />
                    </div>
                  </div>
                </div>
                
                {/* Oven Slot Chart */}
                <div className="col-12 col-md-6">
                  <div className="card shadow-sm border-0 h-100">
                    <div className="card-header bg-white py-3">
                      <h5 className="mb-0">Oven Slot分布</h5>
                    </div>
                    <div className="card-body">
                      <OvenSlotChart data={filteredGlassData} />
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </div>
    </LocalizationProvider>
  );
};

export default Dashboard;