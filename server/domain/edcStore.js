// EDC 資料整批刪除重建（比照 unfinishStore.js：不留歷史，更新 = destroy CASCADE 後重抓重建）。
// edc_glass_comment 是獨立表、不在這裡的 destroy 範圍內 —— 人工註解不受影響。
const { Op } = require('sequelize');
const { EdcRecord, EdcSegment, EdcFlaggedGlass, EdcGlassRecord } = require('../models');
const { CORNER_SUFFIXES, MAX_SHOTS } = require('../models/EdcGlassRecord');
const sequelize = require('../config/database');

// 每片 glass 都落地成 edc_glass_records 一列，且 (day,station,machine) 只有同一天會互相覆蓋、
// 不同天會一直疊加 → 用保留天數清舊資料控制長期成長。
// 預設 60 天（Dave 2026-08-05：磁碟充裕，想留久一點）。估算：單站單日約 1400 片 × 6 站 × 60 天
// ≈ 50 萬列 × 約 320 bytes ≈ 160MB，含 index 約 250MB，對查詢速度沒有影響——所有查詢都帶
// day/station/segment 條件並走 index，不會隨保留天數變慢。
const RETENTION_DAYS = Number(process.env.EDC_RETENTION_DAYS || 60);

// 一次 INSERT 太多列會撐爆 MySQL 的 max_allowed_packet，分塊送（單站單日約 1400 片）
const GLASS_INSERT_CHUNK = 500;

// 原始 glass 列 → edc_glass_records 欄位。只取表頭 7 欄 + 每 shot 的四角點與 Expose，
// 其餘欄位刻意不落地（取捨理由見 models/EdcGlassRecord.js 的註解）。
function toGlassRecordRow(row, { recordId, segmentId, station, machine, recipe }) {
  const out = {
    edc_record_id: recordId,
    edc_segment_id: segmentId,
    glass_id: row.glass_id ?? null,
    lot_id: row.lot_id ?? null,
    event_datetime: formatDt(row.event_datetime),
    station,
    machine,
    recipe: row.recipe ?? recipe ?? null,
    process_complete: row.process_complete ?? null,
  };
  for (let s = 1; s <= MAX_SHOTS; s += 1) {
    for (const suffix of CORNER_SUFFIXES) {
      const col = `Shot${s}_Final_${suffix}`;
      out[col] = toFloat(row[col]);
    }
    const expose = `Shot${s}_Expose`;
    out[expose] = toFloat(row[expose]);
  }
  return out;
}

// 沒用到的 shot 在 EDC 是整欄填 0（不是空白），這裡照原值存 0——是不是「沒用到」由
// edcAnalysis.deriveMonitorColumns 在分析階段判斷，落地層不做語意詮釋，只忠實保存原始值。
function toFloat(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// 由 edcCrawl.js 每次執行後呼叫一次（不是每個 station/machine 呼叫一次）
async function cleanupOldEdcRecords(retentionDays = RETENTION_DAYS) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const pad = (n) => String(n).padStart(2, '0');
  const cutoffDay = `${cutoff.getFullYear()}-${pad(cutoff.getMonth() + 1)}-${pad(cutoff.getDate())}`;
  const deleted = await EdcRecord.destroy({ where: { day: { [Op.lt]: cutoffDay } } });
  return { deleted, cutoffDay };
}

function formatDt(d) {
  if (!d) return null;
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  return dayjsFormat(dt);
}

// 不依賴 dayjs（純 Date 格式化），避免這個小工具多一個外部依賴
function dayjsFormat(dt) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}

/**
 * 以 (day, shift, station, machine) 為單位整批重建 EDC 資料鏈（shift='custom' 時再加 window_start/window_end）。
 * @param {{day:string, shift:'day'|'night'|'custom', station:string, machine:string, segments:Array,
 *   windowStart?:Date, windowEnd?:Date}} params
 *   segments 為 edcAnalysis.analyzeEdcData() 的輸出；windowStart/windowEnd 是這次匯入資料的
 *   時間窗（三種 shift 都會存，前端第1層用它顯示「資料範圍」），但只有 shift='custom' 會拿它當
 *   identity 的一部分，避免不同自訂範圍互相覆蓋
 */
async function replaceEdcRecord({ day, shift, station, machine, segments, windowStart, windowEnd }) {
  const windowStartStr = formatDt(windowStart);
  const windowEndStr = formatDt(windowEnd);

  return sequelize.transaction(async (t) => {
    // ⚠️ window_* 只有 shift='custom' 時參與識別鍵。day/night 一律以 (day,shift,station,machine)
    // 覆蓋——排程每 3 小時跑一次，窗口的 end 每次都往後推，若把 window_* 也納入比對，同一個班別
    // 會累積出 8 筆各自獨立的紀錄（07:00~10:00、07:00~13:00、...），彙總表就會冒出重複列。
    // 兩種 shift 都「儲存」window_*（只是 day/night 不拿它比對），供前端顯示「資料範圍」。
    const destroyWhere = shift === 'custom'
      ? { day, shift, station, machine, window_start: windowStartStr, window_end: windowEndStr }
      : { day, shift, station, machine };
    await EdcRecord.destroy({ where: destroyWhere, transaction: t });

    const maxRange = segments.length ? Math.max(...segments.map((s) => s.maxRange)) : 0;
    const overSpec = segments.some((s) => s.overSpec);

    const record = await EdcRecord.create({
      day, shift, station, machine,
      window_start: windowStartStr,
      window_end: windowEndStr,
      segment_count: segments.length,
      max_range: maxRange,
      over_spec: overSpec,
      event_start: segments[0] ? formatDt(segments[0].eventStart) : null,
      event_end: segments.length ? formatDt(segments[segments.length - 1].eventEnd) : null,
    }, { transaction: t });

    for (const seg of segments) {
      const createdSeg = await EdcSegment.create({
        edc_record_id: record.id,
        segment_index: seg.segmentIndex,
        recipe: seg.recipe,
        event_start: formatDt(seg.eventStart),
        event_end: formatDt(seg.eventEnd),
        glass_count: seg.glassCount,
        boundary_reason: seg.boundaryReason,
        stats: seg.stats,
        max_range: seg.maxRange,
        max_range_column: seg.maxRangeColumn,
        over_spec: seg.overSpec,
        over_spec_columns: (seg.overSpecColumns || []).join(',') || null,
      }, { transaction: t });

      // 該段每一片 glass 的原始量測值（取代舊的 edc_segments.series JSON）
      const glassRows = (seg.rows || []).map((r) => toGlassRecordRow(r, {
        recordId: record.id, segmentId: createdSeg.id, station, machine, recipe: seg.recipe,
      }));
      for (let i = 0; i < glassRows.length; i += GLASS_INSERT_CHUNK) {
        await EdcGlassRecord.bulkCreate(glassRows.slice(i, i + GLASS_INSERT_CHUNK), { transaction: t });
      }

      const flaggedRows = [];
      for (const [col, info] of Object.entries(seg.flaggedByColumn)) {
        for (const f of info.flagged) {
          flaggedRows.push({
            edc_segment_id: createdSeg.id,
            glass_id: f.glass_id,
            event_datetime: formatDt(f.event_datetime),
            station, machine,
            recipe: seg.recipe,
            column_name: col,
            value: f.value,
            segment_median: info.median,
            segment_range: info.range,
            side: f.side,
          });
        }
      }
      if (flaggedRows.length) await EdcFlaggedGlass.bulkCreate(flaggedRows, { transaction: t });
    }

    return { recordId: record.id };
  });
}

module.exports = { replaceEdcRecord, cleanupOldEdcRecords };
