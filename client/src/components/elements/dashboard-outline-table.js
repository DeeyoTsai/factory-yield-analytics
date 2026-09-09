import * as React from "react";
import { DataGrid } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

const columns = [
  // { field: "id", headerName: "ID", width: 70 },
  {
    field: "emp",
    headerName: "工號",
    width: 80,
    headerAlign: "center",
    align: "center",
  },
  {
    field: "line",
    headerName: "Line",
    width: 80,
    headerAlign: "center",
    align: "center",
  },
  {
    field: "product",
    headerName: "產品",
    width: 120,
    headerAlign: "center",
    align: "center",
  },
  {
    field: "lot",
    headerName: "LOT",
    width: 100,
    headerAlign: "center",
    align: "center",
  },
  {
    field: "first",
    headerName: "1st",
    width: 150,
    type: "number",
    headerAlign: "center",
    align: "center",
  },
  {
    field: "second",
    headerName: "2nd",
    width: 150,
    type: "number",
    headerAlign: "center",
    align: "center",
  },
  {
    field: "third",
    headerName: "3rd",
    width: 150,
    type: "number",
    headerAlign: "center",
    align: "center",
  },
  {
    field: "datetime",
    headerName: "日期時間",
    width: 180,
    headerAlign: "center",
    align: "center",
    valueFormatter: (params) => {
      if (params) {
        return new Date(params).toLocaleString("zh-TW");
      }
      return "";
    },
  },
  {
    field: "comment",
    headerName: "備註",
    width: 600,
    headerAlign: "center",
    align: "center",
  },
];

const paginationModel = { page: 0, pageSize: 10 };

export default function DashboardOutlineTable({
  data = [],
  loading = false,
  // selectedRows = [],
  // onSelectionChange = () => {},
}) {
  // 簡化的數據處理
  const rows = Array.isArray(data) ? data : [];

  if (loading) {
    return (
      <Paper
        sx={{
          height: 410,
          width: "100%",
        }}
      >
        <div className="d-flex justify-content-center align-items-center h-100">
          <div className="text-center">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">載入中...</span>
            </div>
            <Typography className="mt-2">載入生產資料中...</Typography>
          </div>
        </div>
      </Paper>
    );
  }

  return (
    <div>
      <Paper sx={{ height: 410, width: "100%" }}>
        {/* <div className="p-2">
          <Typography variant="h6" className="mb-2">
            生產批次明細
          </Typography>
        </div> */}
        <DataGrid
          // className="shadow-none"
          rows={rows}
          columns={columns}
          initialState={{ pagination: { paginationModel } }}
          pageSizeOptions={[10, 20]}
          sx={{ border: 0 }}
          rowHeight={35}
          getRowId={(row) => row.id}
          // checkboxSelection
          localeText={{
            noRowsLabel: "沒有資料",
            footerRowSelected: (count) => `已選取 ${count} 筆資料`,
            footerTotalRows: "總筆數:",
          }}
        />
      </Paper>
      {/* <Paper sx={{ height: 410, width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          initialState={{ pagination: { paginationModel } }}
          pageSizeOptions={[10, 20]}
          getRowId={(row) => row.id}
          checkboxSelection
          sx={{ border: 0 }}
          rowHeight={35}
        />
      </Paper> */}
    </div>
  );
}
