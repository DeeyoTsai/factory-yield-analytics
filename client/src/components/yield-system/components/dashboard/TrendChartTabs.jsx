import React, { useEffect, useState } from 'react';
import { Box, Tabs, Tab, Typography } from '@mui/material';
import TrendChartMui from './TrendChartMui';

// 集中趨勢圖的容器。同一個 defect 若兩條線（phase 1/2）都有發生，趨勢會有兩筆
// （由匯入流程決定；內建 seed 只有單 phase），這裡用分頁籤切換。
//
// 為什麼是分頁籤而不是上下堆疊：卡片高度必須固定，才能跟同一列左邊的 Rework History
// 對齊；堆疊會讓這張卡變兩倍高、整列底邊參差。
//
// 琥珀色沿用「站別檢出分布」標記趨勢圖查詢站的同一個色（#d97706）——同一條 line
// 在兩張卡片上是同一個顏色，視線可以直接串起來。

const AMBER = '#d97706';

// ⚠️ 只渲染目前選中的那一張。TrendChartMui 內部用 ResizeObserver 量容器寬度，
// 藏起來的容器寬度是 0，會把圖表寬度算成 0；切回來也不會自己修正。
// 代價是切頁籤會重新打一次 API，但那是本機同源請求，可接受。
const TrendChartTabs = ({ trendMetas = [] }) => {
  const [idx, setIdx] = useState(0);

  // 換 defect 時要回到第一頁，否則舊的索引可能超出新的筆數
  useEffect(() => { setIdx(0); }, [trendMetas]);

  if (!trendMetas.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary">無趨勢圖資料</Typography>
      </Box>
    );
  }

  const active = trendMetas[Math.min(idx, trendMetas.length - 1)];

  return (
    <Box>
      {trendMetas.length > 1 ? (
        <Tabs
          value={Math.min(idx, trendMetas.length - 1)}
          onChange={(_, v) => setIdx(v)}
          variant="fullWidth"
          sx={{
            minHeight: 38,
            mb: 1,
            borderBottom: '1px solid #e5e7eb',
            '& .MuiTab-root': { minHeight: 38, py: 0, textTransform: 'none', fontSize: 13 },
            '& .Mui-selected': { color: `${AMBER} !important` },
            '& .MuiTabs-indicator': { backgroundColor: AMBER, height: 3 },
          }}
        >
          {trendMetas.map((t) => (
            <Tab
              key={t.id}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box component="span" sx={{ fontWeight: 700 }}>{t.process}</Box>
                  {/* <Box component="span" sx={{ fontSize: 11, color: 'text.secondary', fontFamily: 'ui-monospace, monospace' }}>
                    {t.tool_id}
                  </Box> */}
                </Box>
              }
            />
          ))}
        </Tabs>
      ) : (
        // 單一 line 不需要頁籤，但仍要標出查的是哪條 line／哪台機——那正是這批改動的重點
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75, mb: 1 }}>
          <Box component="span" sx={{
            fontWeight: 700, fontSize: 12, color: '#b45309',
            border: `1px solid ${AMBER}`, bgcolor: '#fffbeb', borderRadius: 999, px: 1.25, py: 0.1,
          }}>
            {active.process}
          </Box>
          {/* <Box component="span" sx={{ fontSize: 11, color: 'text.secondary', fontFamily: 'ui-monospace, monospace' }}>
            {active.tool_id}
          </Box> */}
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ width: '100%' }}>
          <TrendChartMui
            key={active.id}
            apiPath={`/api/trend-chart/${active.id}`}
            hasTrendChartData
            setHasTrendChartData={() => {}}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default TrendChartTabs;
