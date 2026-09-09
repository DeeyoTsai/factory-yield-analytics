import React from 'react';
import { Chip } from '@mui/material';
import EdcFlaggedGlassTable from './EdcFlaggedGlassTable';
import EdcColumnTrendChart from './EdcColumnTrendChart';

// 對應後端 edcAnalysis.js 分段時記錄的 boundary_reason，轉成中文顯示在 Chip 上
const BOUNDARY_LABEL = { start: '起始', recipe: '換品種', relogin: '重登斷層' };

// 第 2 層：點選 (站別,品種) 群組後顯示——各分段的全距（重登斷差前後各是一段，各自獨立算 max/min/全距）
// + by shot 散點圖 + 異常基板清單（可確認+下 comment）。
// props 皆來自父層 EdcRangeView.jsx 對 GET /api/edc/group/flagged 的回應：
//   group＝目前選取的彙總列（站別/品種/班別）；segments＝該群組的分段 meta（給上方 Chip 用）；
//   flaggedGlass＝異常基板明細；byColumn＝逐欄位、逐段的完整序列（給下方 chart 用）；
//   threshold＝後端算 OOS 上下限用的門檻 T；onSaveComment＝儲存人工確認/備註的 callback。
const EdcFlaggedPanel = ({ group, segments = [], flaggedGlass, byColumn, threshold, onSaveComment }) => {
  if (!group) return null;

  return (
    <div className="row g-3">
      {/* 各分段全距一覽：明確展示「重登斷差前後」每一段都各自算了 max/min/全距，不是只算合併後的最大值 */}
      <div className="col-12">
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <small className="text-muted me-2">此群組由 {segments.length} 段組成：</small>
          {segments.map((s, i) => (
            <Chip key={s.id} size="small"
              variant={s.over_spec ? 'filled' : 'outlined'}
              sx={s.over_spec ? { backgroundColor: '#dc2626', color: '#fff' } : {}}
              label={`第${i + 1}段(${BOUNDARY_LABEL[s.boundary_reason] || s.boundary_reason}, ${s.recipe || '-'}, ${s.glass_count}枚) 全距${s.max_range?.toFixed?.(2)}${s.max_range_column ? ' @' + s.max_range_column : ''}`}
            />
          ))}
        </div>
      </div>
      <div className="col-12">
        <div className="card shadow-sm border-0">
          <div className="card-header border-0 py-2 text-center" style={{ backgroundColor: '#f8f9fa' }}>
            <h6 className="mb-0 fw-bold">{group.station}｜{group.recipe} by shot 散點圖</h6>
          </div>
          <div className="card-body">
            <EdcColumnTrendChart byColumn={byColumn} flaggedGlass={flaggedGlass} threshold={threshold} />
          </div>
        </div>
      </div>
      <div className="col-12">
        <EdcFlaggedGlassTable flaggedGlass={flaggedGlass} onSave={onSaveComment} />
      </div>
    </div>
  );
};

export default EdcFlaggedPanel;
