import React, { useState, useEffect, useMemo, useRef } from "react";
import { FaTrashAlt } from "react-icons/fa";
import "../css/fma-table-element.css";
import { DEFECT_TYPES } from "../../config/defectTypes";

// 12 類缺陷：key = fmatb 欄位名、label = 顯示名
const DEFECT_KEYS = DEFECT_TYPES.map((d) => d.key);
const DEFECT_LABELS = DEFECT_TYPES.map((d) => d.label);

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const sum = (arr) => arr.reduce((a, b) => a + b, 0);

function emptyRow(id, numCustom) {
  const row = { id, gid: "", s: "", m: "", l: "", otherdf: {} };
  for (const k of DEFECT_KEYS) row[k] = "";
  for (let c = 1; c <= numCustom; c += 1) row.otherdf[`selfDefine_${c}`] = { "": "" };
  return row;
}

/**
 * FMA 填表的核心表格（受控 input，不用 contenteditable）。
 *
 * props:
 *  - product            產品名（顯示在表頭）
 *  - editable           true = 唯讀（沿用舊命名，true 代表不可編輯）
 *  - standardRowNum     目標列數（「新增項次」按鈕控制）
 *  - othersColSpan      5 + 自訂欄數（「新增欄位」按鈕控制）
 *  - glassDataSet       非空陣列時代表「編輯既有資料」，用它初始化
 *  - setGlassDataSet    每次表格變動就把目前列資料同步回 parent（送出/更新時用）
 *  - smlMap / predictMap  { gid: {...} } —— 由 YOLO 影像複判帶入的 S/M/L 與缺陷預填
 *  - setDfRatioForLine / setDfAvgForBar / setSmlAvg  餵給 FMA 圖表
 *  - customColNames / setCustomColNames  自訂欄名（string[]，長度 = othersColSpan-5）
 *  - presetGids         一鍵帶入示範 Glass ID（demo 用；傳新陣列即套用到前 N 列）
 */
const FmaTableElement = ({
  product,
  editable,
  standardRowNum,
  setStandardRowNum,
  othersColSpan = 5,
  glassDataSet,
  setGlassDataSet,
  smlMap,
  predictMap,
  setDfRatioForLine,
  setDfAvgForBar,
  setSmlAvg,
  customColNames = [],
  setCustomColNames,
  presetGids,
}) => {
  const numCustom = Math.max(0, othersColSpan - 5);
  const readOnly = !!editable;

  const [rows, setRows] = useState(() => {
    return Array.from({ length: standardRowNum }, (_, i) => emptyRow(i, numCustom));
  });
  const didInitFromGlassData = useRef(false);

  // 編輯既有資料：用 glassDataSet 初始化一次
  useEffect(() => {
    if (didInitFromGlassData.current) return;
    if (!Array.isArray(glassDataSet) || glassDataSet.length === 0) return;
    didInitFromGlassData.current = true;

    const mapped = glassDataSet.map((g, i) => {
      const row = { id: i, sqlId: g.sqlId ?? g.id, gid: g.gid ?? "", s: g.s ?? "", m: g.m ?? "", l: g.l ?? "", otherdf: {} };
      for (const k of DEFECT_KEYS) row[k] = g[k] ?? "";
      // otherdf 可能是陣列 [{name:count}] 或已是 { selfDefine_n: {name:count} }
      const od = g.otherdf;
      if (Array.isArray(od)) {
        od.forEach((obj, idx) => {
          row.otherdf[`selfDefine_${idx + 1}`] = { ...obj };
        });
      } else if (od && typeof od === "object") {
        row.otherdf = JSON.parse(JSON.stringify(od));
      }
      return row;
    });
    setRows(mapped);
    setStandardRowNum?.(mapped.length);

    // 還原自訂欄名
    const names = [];
    const first = mapped[0]?.otherdf || {};
    Object.keys(first).forEach((k) => {
      names.push(Object.keys(first[k])[0] || "");
    });
    if (names.length) setCustomColNames?.(names);
  }, [glassDataSet, setStandardRowNum, setCustomColNames]);

  // 「新增項次 / 刪列」→ 對齊 standardRowNum
  useEffect(() => {
    setRows((prev) => {
      if (prev.length === standardRowNum) return prev;
      if (prev.length < standardRowNum) {
        const extra = Array.from({ length: standardRowNum - prev.length }, (_, i) =>
          emptyRow(prev.length + i, numCustom)
        );
        return [...prev, ...extra];
      }
      return prev.slice(0, standardRowNum).map((r, i) => ({ ...r, id: i }));
    });
  }, [standardRowNum, numCustom]);

  // 「新增欄位」→ 對齊自訂欄數
  useEffect(() => {
    setRows((prev) =>
      prev.map((r) => {
        const od = { ...r.otherdf };
        for (let c = 1; c <= numCustom; c += 1) {
          if (!od[`selfDefine_${c}`]) od[`selfDefine_${c}`] = { "": "" };
        }
        Object.keys(od).forEach((k) => {
          const idx = Number(k.split("_")[1]);
          if (idx > numCustom) delete od[k];
        });
        return { ...r, otherdf: od };
      })
    );
  }, [numCustom]);

  // 一鍵帶入示範 Glass ID（demo 引導用；presetGids 每次點擊都是新陣列所以會重跑）
  useEffect(() => {
    if (!Array.isArray(presetGids) || presetGids.length === 0) return;
    setStandardRowNum?.((n) => Math.max(n, presetGids.length));
    setRows((prev) => {
      const next = [...prev];
      while (next.length < presetGids.length) next.push(emptyRow(next.length, numCustom));
      return next.map((r, i) => (i < presetGids.length ? { ...r, gid: presetGids[i] } : r));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetGids]);

  // YOLO 預填：pred 有值、且該列還沒被填過才套用
  useEffect(() => {
    if (!predictMap || Object.keys(predictMap).length === 0) return;
    setRows((prev) =>
      prev.map((r) => {
        const pred = r.gid && predictMap[r.gid];
        if (!pred) return r;
        const already = DEFECT_KEYS.some((k) => num(r[k]) > 0);
        if (already) return r;
        return { ...r, ...pred };
      })
    );
  }, [predictMap]);

  // 影像複判帶回的 S/M/L
  useEffect(() => {
    if (!smlMap || Object.keys(smlMap).length === 0) return;
    setRows((prev) =>
      prev.map((r) => {
        const sml = r.gid && smlMap[r.gid];
        return sml ? { ...r, s: sml.s ?? r.s, m: sml.m ?? r.m, l: sml.l ?? r.l } : r;
      })
    );
  }, [smlMap]);

  const setCell = (rowIdx, key, value) => {
    setRows((prev) => prev.map((r, i) => (i === rowIdx ? { ...r, [key]: value } : r)));
  };
  const setCustomCell = (rowIdx, col, value) => {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== rowIdx) return r;
        const od = JSON.parse(JSON.stringify(r.otherdf));
        const name = Object.keys(od[`selfDefine_${col}`] || { "": "" })[0] || "";
        od[`selfDefine_${col}`] = { [name]: value };
        return { ...r, otherdf: od };
      })
    );
  };
  const renameCustomCol = (col, name) => {
    setCustomColNames?.(
      Array.from({ length: numCustom }, (_, i) => (i + 1 === col ? name : customColNames[i] || ""))
    );
    setRows((prev) =>
      prev.map((r) => {
        const od = JSON.parse(JSON.stringify(r.otherdf));
        const prevVal = Object.values(od[`selfDefine_${col}`] || { "": "" })[0] ?? "";
        od[`selfDefine_${col}`] = { [name]: prevVal };
        return { ...r, otherdf: od };
      })
    );
  };
  const deleteRow = (rowIdx) => {
    setStandardRowNum?.((n) => Math.max(0, n - 1));
    setRows((prev) => prev.filter((_, i) => i !== rowIdx).map((r, i) => ({ ...r, id: i })));
  };

  const filledRows = rows.filter((r) => String(r.gid).trim().length > 0);
  const rowDefectTotal = (r) =>
    sum(DEFECT_KEYS.map((k) => num(r[k]))) +
    sum(Object.values(r.otherdf || {}).map((o) => num(Object.values(o)[0])));
  const rowSmlTotal = (r) => num(r.s) + num(r.m) + num(r.l);

  // 表尾統計 + 對外回呼
  // ⚠️ 長度必須恆等於「12 + numCustom」，跟表頭/表身一致，否則表尾各列 <td> 數對不上、欄位錯位。
  // 自訂欄還沒命名時 customColNames 可能比 numCustom 短，用暫定名補齊。
  const colLabels = useMemo(
    () => [
      ...DEFECT_LABELS,
      ...Array.from({ length: numCustom }, (_, i) => customColNames[i] || `自訂${i + 1}`),
    ],
    [customColNames, numCustom]
  );
  const stats = useMemo(() => {
    const totals = colLabels.map((_, ci) =>
      sum(
        rows.map((r) => {
          if (ci < DEFECT_KEYS.length) return num(r[DEFECT_KEYS[ci]]);
          const key = `selfDefine_${ci - DEFECT_KEYS.length + 1}`;
          return num(Object.values(r.otherdf?.[key] || {})[0]);
        })
      )
    );
    const denom = Math.max(1, filledRows.length);
    const avgs = totals.map((t) => t / denom);
    const grand = sum(totals) || 1;
    const ratios = totals.map((t) => t / grand);
    let acc = 0;
    const accRatios = ratios.map((r) => (acc += r));
    return { totals, avgs, ratios, accRatios };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, colLabels, numCustom]);

  useEffect(() => {
    setGlassDataSet?.(rows);
    // ⚠️ 傳複本，不要把 stats 內的陣列本體交出去 —— 下游若就地排序/截斷
    // （FmaEchartElement 舊版就是這樣做），表尾的 Avg Num / 百分比(%) 兩列會被毀掉。
    setDfAvgForBar?.([...stats.avgs]);
    setDfRatioForLine?.([...stats.ratios]);
    const smlTotals = filledRows.map(rowSmlTotal);
    setSmlAvg?.((sum(smlTotals) / Math.max(1, filledRows.length)).toFixed(1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, stats]);

  const cellInput = (value, onChange) => (
    <input
      type="number"
      min="0"
      className="fma-cell-input"
      value={value === 0 ? "0" : value}
      disabled={readOnly}
      onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
    />
  );

  return (
    <div className="fma-result-input">
      <table className="fma-table">
        <colgroup>
          <col className="col-item" />
          <col className="col-gid" />
          {colLabels.map((_, i) => (
            <col key={`cd-${i}`} className="col-df" />
          ))}
          <col className="col-total" />
          <col className="col-cal" />
          <col className="col-cal" />
          <col className="col-cal" />
          <col className="col-total" />
          <col className="col-trash" />
        </colgroup>
        <thead>
          <tr>
            <th rowSpan={2}>項次</th>
            <th rowSpan={2}>{product || "產品/Glass"}</th>
            <th colSpan={colLabels.length}>Defect Type</th>
            <th>FMA Total</th>
            <th className="df-cal" colSpan={4}>Sheet Data</th>
            {/* 垃圾桶欄刻意不給表頭（與私有版一致），由 colgroup 的 col-trash 決定寬度 */}
          </tr>
          <tr>
            {DEFECT_LABELS.map((lab) => (
              <th key={lab}>{lab}</th>
            ))}
            {Array.from({ length: numCustom }, (_, i) => (
              <th key={`cc-${i}`}>
                <input
                  className="fma-cell-input"
                  placeholder={`自訂${i + 1}`}
                  value={customColNames[i] || ""}
                  disabled={readOnly}
                  onChange={(e) => renameCustomCol(i + 1, e.target.value)}
                />
              </th>
            ))}
            <th>單枚總和</th>
            <th className="df-cal">S</th>
            <th className="df-cal">M</th>
            <th className="df-cal">L</th>
            <th className="df-cal">Total</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r, i) => (
            <tr className="df-row" key={r.id}>
              <td className="item">{i + 1}</td>
              <td className="gid">
                <input
                  className="fma-cell-input"
                  value={r.gid}
                  disabled={readOnly}
                  onChange={(e) => setCell(i, "gid", e.target.value)}
                />
              </td>
              {DEFECT_KEYS.map((k) => (
                <td key={k} className="edit-color">
                  {cellInput(r[k], (v) => setCell(i, k, v))}
                </td>
              ))}
              {Array.from({ length: numCustom }, (_, c) => {
                const val = Object.values(r.otherdf?.[`selfDefine_${c + 1}`] || {})[0] ?? "";
                return (
                  <td key={`c-${c}`} className="edit-color">
                    {cellInput(val, (v) => setCustomCell(i, c + 1, v))}
                  </td>
                );
              })}
              <td className="fma-total">{rowDefectTotal(r)}</td>
              <td className="edit-color">{cellInput(r.s, (v) => setCell(i, "s", v))}</td>
              <td className="edit-color">{cellInput(r.m, (v) => setCell(i, "m", v))}</td>
              <td className="edit-color">{cellInput(r.l, (v) => setCell(i, "l", v))}</td>
              <td className="df-sum">{rowSmlTotal(r)}</td>
              <td style={{ border: "none" }}>
                <button
                  type="button"
                  className="trash-button"
                  disabled={readOnly}
                  onClick={() => deleteRow(i)}
                  style={{ border: "none", background: "transparent", cursor: "pointer" }}
                >
                  <FaTrashAlt className="trash-button-icon" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr className="total-num">
            <td colSpan={2}>Total Num</td>
            {stats.totals.map((t, i) => (
              <td key={i} className="df-total-num">{t}</td>
            ))}
            <td className="df-total-all">{sum(stats.totals)}</td>
            <td className="s-m-l-sum" colSpan={3}>Avg.</td>
            <td className="s-m-l-sum">
              {(sum(filledRows.map(rowSmlTotal)) / Math.max(1, filledRows.length)).toFixed(1)}
            </td>
          </tr>
          <tr className="avg-num">
            <td colSpan={2}>Avg Num</td>
            {stats.avgs.map((a, i) => (
              <td key={i} className="df-avg-num">{a.toFixed(1)}</td>
            ))}
            <td className="fma-avg-all">{sum(stats.avgs).toFixed(1)}</td>
          </tr>
          <tr className="df-ratio">
            <td colSpan={2}>百分比(%)</td>
            {stats.ratios.map((r, i) => (
              <td key={i} className="df-ratio-num">{(r * 100).toFixed(0)}</td>
            ))}
            <td className="df-ratio-all">100</td>
          </tr>
          <tr className="acc-ratio">
            <td colSpan={2}>累計百分比</td>
            {stats.accRatios.map((r, i) => (
              <td key={i} className="df-acc-num">{(r * 100).toFixed(0)}</td>
            ))}
            <td className="df-acc-all">100</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default FmaTableElement;
