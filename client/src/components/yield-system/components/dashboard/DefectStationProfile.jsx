import React, { useMemo } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { buildStationProfile, STATIONS } from '../../utils/stationProfile';

// 站別檢出分布：取代原本的 Defect Images 卡片（照片已內嵌進 Glass Details 表格）。
//
// 這張圖的主要任務不是「再畫一次資料」，而是**驗證集中趨勢圖查的站別對不對**。
// 趨勢圖的查詢站由爬蟲 xlsProcess() 推導：**顏色取自 dfcode 首字、完全不看站別資料**，
// 站別資料只決定線號。所以實際檢出最強的站可能根本不是趨勢圖查的那站
// （Dave 實際遇過 G 檢出不少枚、趨勢圖卻查 B CTR）。
// 線號自 2026-08-15 起改為「出現過的線號全部各查一次」（phaseProcess.js），
// 不再只取眾數，所以 trendMetas 可能有兩筆。
//
// 刻意用純 CSS flexbox 而非 echarts：本圖是固定 9 列 + 每列多個標記（抽檢站符號、
// 趨勢圖查詢站外框、rework 數字）的彙總，echarts 要靠 axisLabel rich text + markArea
// 才做得出來，反而更難維護；Pi 上也更輕。畫連續數列的圖（UnfinishLotOverviewChart、
// EdcColumnTrendChart）才用 echarts。

const BAR_H = 14;

// totalCount = 未過濾的 glass 總數。glassData 是依 Glass Details 勾選過濾後的，
// 兩者不同時代表使用者動過勾選 → 說明列與外框位置就不可直接比對（見下方註記）。
// trendMetas 是陣列：同一 defect 若兩條線（phase 1/2）都有發生，趨勢圖會查兩站，兩站都要標。
const DefectStationProfile = ({ glassData = [], trendMetas = [], totalCount = null }) => {
  const profile = useMemo(() => buildStationProfile(glassData), [glassData]);
  const { rows, maxDetected, others, othersTotal, firstStopMode, totalGlass } = profile;

  // 趨勢圖的 process 可能是垃圾值：找不到任何帶線號的第一檢出站時，爬蟲會退回
  // 「眾數末字當線號」的舊路徑，'Unknown' → 'n'（'Bn'）、'Offline_AOI' → 'I'（'BI'）。
  const validTrends = trendMetas.filter((t) => STATIONS.includes(t.process));
  const invalidTrends = trendMetas.filter((t) => !STATIONS.includes(t.process));
  const trendStations = new Set(validTrends.map((t) => t.process));

  // ⚠️ 外框位置（trendMetas[].process）是爬蟲用**全部** glass 算好存進 DB 的固定值，
  // 但長條與其他/未判定的統計是依當下勾選重算的。動過勾選後兩者不可直接比對，要明講。
  const isFiltered = Number.isFinite(totalCount) && totalCount !== totalGlass;

  if (!totalGlass) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">無 glass 資料</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ fontSize: 12 }}>
      {/* 表頭 */}
      <Box sx={{ display: 'flex', alignItems: 'center', pb: 0.5, color: 'text.secondary', fontSize: 11 }}>
        <Box sx={{ width: 46, flexShrink: 0 }}>站別</Box>
        <Box sx={{ flex: 1 }} />
        <Box sx={{ width: 62, textAlign: 'right', flexShrink: 0 }}>檢出第一站/有進的ADI</Box>
        <Box sx={{ width: 34, textAlign: 'right', flexShrink: 0 }}>⟳</Box>
      </Box>

      {rows.map((r) => {
        const isTrend = trendStations.has(r.station);
        return (
          <Box
            key={r.station}
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.5, py: 0.25, px: 0.5,
              borderRadius: 1,
              // 趨勢圖實際查詢的那一站加外框，跟實心最高的站是否一致，就是這張圖要回答的問題
              border: isTrend ? '2px solid #d97706' : '2px solid transparent',
              bgcolor: isTrend ? 'rgba(217,119,6,0.06)' : 'transparent',
            }}
          >
            <Box sx={{ width: 46, flexShrink: 0, fontWeight: isTrend ? 700 : 400 }}>
              {isTrend && <span title="集中趨勢圖實際查詢的站別">▸</span>}
              {r.station}
              {r.isSampling && (
                <Tooltip title="抽檢站：不是每片都進，數量偏低不代表無異常">
                  <span style={{ color: '#6b7280' }}>⚲</span>
                </Tooltip>
              )}
            </Box>

            {/* 淡色底＝有檢出，實心＝第一檢出。兩條共用同一比例尺，落差本身就是訊息：
                落差大＝這站只是跟著看到；實心佔比高＝這站才是源頭 */}
            <Tooltip
              // title={`${r.station}：第一檢出 ${r.firstCount} 片、有檢出 ${r.detectedCount} 片`}
              title={`${r.station}：檢出的 ${r.detectedCount} 片中，有 ${r.firstCount} 片 ${r.station} 是有檢出的第一站`}
            >
              <Box sx={{ flex: 1, minWidth: 40, position: 'relative', height: BAR_H }}>
                <Box sx={{
                  position: 'absolute', inset: 0, width: `${(r.detectedCount / maxDetected) * 100}%`,
                  bgcolor: '#bfdbfe', borderRadius: 0.5,
                }} />
                <Box sx={{
                  position: 'absolute', top: 0, left: 0, height: BAR_H,
                  width: `${(r.firstCount / maxDetected) * 100}%`,
                  bgcolor: '#2563eb', borderRadius: 0.5,
                }} />
              </Box>
            </Tooltip>

            <Box sx={{ width: 62, textAlign: 'right', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
              <strong>{r.firstCount}</strong>
              <span style={{ color: '#9ca3af' }}>/{r.detectedCount}</span>
            </Box>
            <Box sx={{ width: 34, textAlign: 'right', flexShrink: 0, color: r.rework ? '#b45309' : '#d1d5db' }}>
              {r.rework || '─'}
            </Box>
          </Box>
        );
      })}

      {/* firststop 落在 9 站之外的（Unknown / OC2 / MVA / PS1 / PS2）。
          Unknown 特別重要：它會參與爬蟲的第一檢出站眾數計算，佔多數時會推出垃圾 process */}
      {othersTotal > 0 && (
        <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
          其他/未判定：{othersTotal} 片（{others.map((o) => `${o.name} ${o.count}`).join('、')}）
        </Typography>
      )}

      <Box sx={{ mt: 0.75, pt: 0.75, borderTop: '1px solid #e5e7eb', fontSize: 11, color: 'text.secondary' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
          <span><Box component="span" sx={{ display: 'inline-block', width: 10, height: 10, bgcolor: '#2563eb', borderRadius: 0.5, mr: 0.5 }} />第一檢出站數量</span>
          <span><Box component="span" sx={{ display: 'inline-block', width: 10, height: 10, bgcolor: '#bfdbfe', borderRadius: 0.5, mr: 0.5 }} />進ADI片數</span>
          {/* <span>⚲抽檢站</span> */}
          <span>⟳ Rework</span>
        </Box>

        {trendMetas.length ? (
          <>
            {validTrends.length > 0 && (
              <span>
                趨勢圖查{' '}
                {validTrends.map((t, i) => (
                  <React.Fragment key={t.id ?? t.process}>
                    {i > 0 && '、'}
                    <strong>{t.process}</strong>{t.tool_id ? `（${t.tool_id}）` : ''}
                  </React.Fragment>
                ))}
                ：
                {/* 顏色取自 dfcode 首字 {validTrends[0].dfcode ? `（${validTrends[0].dfcode}）` : ''}，
                線號取自第一檢出站（出現過的線號都會各查一次） */}
                <br />
                1. 當同Phase的有兩條Line以上的FirstStopRatio (該Line的，檢出第一站加總/入檢數加總)相同時，取Defect Code字首顏色跟該Phase查詢趨勢圖 
                <br />
                2. 當FirstStopRatio只有一條Line有最大值，代表firststop(檢出的第一站)，高度集中某條Line
                <br />
                <div style={{marginLeft:'20px'}}>
                  <div>2.1 如果眾數站別跟defect Code相同，以眾數站別查詢趨勢圖</div>
                  <div>2.2 如果眾數站別跟defect Code不同，需確認前站，dfCode站別是否真的有入檢，至少要有兩筆入檢記錄，否則維持Defect Code字首顏色跟該Phase查詢趨勢圖</div>                  
                </div>
              </span>
            )}
            {invalidTrends.length > 0 && (
              <Box component="span" sx={{ display: 'block', color: '#b91c1c' }}>
                ⚠ 趨勢圖查詢站別「{invalidTrends.map((t) => t.process).join('、')}」不在標準站別清單中
                {firstStopMode ? `（找不到帶線號的第一檢出站，退回用眾數「${firstStopMode}」的末字，見 phaseProcess.js）` : ''}
              </Box>
            )}
          </>
        ) : (
          <span>尚無趨勢圖資料，無法比對查詢站別</span>
        )}

        {/* 勾選後眾數會跟著重算，但外框位置是 DB 的固定值 → 明講此時不可直接比對 */}
        {isFiltered && (
          <Box component="span" sx={{ display: 'block', mt: 0.25, color: '#b45309' }}>
            （目前為勾選 {totalGlass}/{totalCount} 片重算，趨勢圖查的站別是用全部 {totalCount} 片決定的）
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default DefectStationProfile;
