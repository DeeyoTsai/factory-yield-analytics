import React from 'react';
import { 
  ImageList, 
  ImageListItem, 
  ImageListItemBar,
  Typography,
  Box
} from '@mui/material';
// 原本這裡有一份自己的 changeUrl()，只認本機路徑。GlassInfo.img 可能存外部影像伺服器的直連 URL，
// 舊版會把 'http://...' 拿去 split('public') 切爛而整片破圖 → 改用共用的 resolveDefectImgSrc()，
// 它同時認 http URL（新資料）與 media/public 本機路徑（歷史資料）。
import { resolveDefectImgSrc } from '../../utils/defectImgSrc';

function imgName(path) {
  const p_len = path.split('\\').length
  const imgN = path.split('\\')[p_len-1].split('_')[0]
  return imgN
}

function getBorderColor(inStops, firstStop) {
  // // const inStopArr = inStops.split(',')
  // console.log(inStopArr);
  

  // 第一檢出站為 BM
  if (firstStop.includes('BM')) {
    // console.log('-----BM----');
    return {
      color: '#525151',
      width: '6px'
    }
  // 第一檢出站為 R
  }else if (firstStop.includes('R')) {
    return {
      color:'#ff0000',
      width: '4px'
    }    
  // ADI有入檢BM、R、G，且第一檢出站為G
  }else if ((["BM", "R", "G"].every(sub => inStops.includes(sub))) && firstStop.includes('G')) {
    return {
      color:'#7ed321',
      width:'4px'
    }
  }
  else{
    return {
      color:'#ffffff',
      width: '0px'
    }
  }
}

const ImageGallery = ({ images }) => {
  if (!images || images.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 50 }}>
        <Typography variant="body1" color="text.secondary">
          No images found for this date.
        </Typography>
      </Box>
    );
  }
  // console.log(images);

  return (
    <ImageList 
      sx={{ 
        width: '100%', 
        maxHeight:360,
        margin: 0
      }} 
      cols={4} 
      rowHeight={120}
      gap={2}
    >
      {images.map((item) => {

      // console.log(item.firststop);
      const borderStyle = getBorderColor(item.inspectstops, item.firststop)
      // 無圖（NA／空值）就整格跳過，不要 render 出 src="null" 的破圖
      const src = resolveDefectImgSrc(item.url);
      if (!src) return null;

      return (
        <ImageListItem key={item.id} sx={{ overflow: 'hidden', p:0.2 }}>
          {/* <Box
            sx={{
              position:'relative',
              height:'100%',
              overflow:'hidden',
            }}
          > */}
            {/* src 原本會接 '?w=248&fit=crop&auto=format'（MUI 範例殘留的 Unsplash 參數），
                對本機檔案沒作用，接在外部 URL 後面反而有打壞 query string 的風險 → 移除 */}
            <img
              src={src}
              alt={item.filename}
              loading="lazy"
              style={{ 
                objectFit: 'cover', 
                background: '#f0f0f0', 
                height: '85%',
                cursor: 'pointer',
                marginBottom:0,
                // border: `${borderStyle.width} solid ${borderStyle.color}}`,
                border: `${borderStyle.width} solid ${borderStyle.color}`,
                // boxSizing:'border-box'
                
              }}
              onClick={() => window.open(src, '_blank')}
            />        

          {/* </Box> */}

          <ImageListItemBar
            title={
              <Typography sx={{ fontSize:10, p:0, textAlign:'center'}}>
                {imgName(item.filename)}
              </Typography>
              
            }
            // subtitle="2026-05-29"
            position="bottom"                  // 圖片外面下方
            
          />    
        </ImageListItem>
      )})}
    </ImageList>
  );
};

export default ImageGallery;
