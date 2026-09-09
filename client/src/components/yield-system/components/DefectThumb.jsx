import React from 'react';
import { Typography } from '@mui/material';

// 表格內的 defect 縮圖欄位。點擊由父層開 Dialog 放大（先 stopPropagation，
// 避免在「整列可點選取」的表格裡誤觸勾選）；圖抓不到時直接隱藏，不留破圖 icon。
// src 必須是已經正規化過的值——daily 走 utils/defectImgSrc.js 的 resolveDefectImgSrc()，
// 未結批的 img_url_1/2 本來就是 EIS 直連 URL，直接傳即可。
const DefectThumb = ({ src, onZoom, height = 60 }) => (src ? (
  <img
    src={src}
    alt="defect"
    style={{ height, cursor: 'zoom-in' }}
    onClick={(e) => { e.stopPropagation(); onZoom(src); }}
    onError={(e) => { e.target.style.display = 'none'; }}
  />
) : (
  <Typography variant="caption" color="text.secondary">無圖</Typography>
));

export default DefectThumb;
