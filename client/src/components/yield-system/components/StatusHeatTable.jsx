import React, { useMemo } from 'react';
import dayjs from 'dayjs';

const StatusHeatTable = ({ data: eqData }) => {
  const LINES = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'];

  const tableRows = useMemo(() => {
    if (!eqData || eqData.length === 0) return [];

    const map = {};
    eqData.forEach(v => {
      if (!v.begintime || !v.endtime) return;
      const hours = (dayjs(v.endtime).valueOf() - dayjs(v.begintime).valueOf()) / 3600000;
      const key = `${v.line}__${v.status}`;
      if (!map[key]) map[key] = { line: v.line, status: v.status, hours: 0 };
      map[key].hours += hours;
    });
    console.log(map);
    
    return Object.values(map)
      .map(r => ({ ...r, hours: +r.hours.toFixed(2) }))
      .sort((a, b) => {
        const lineIndexA = LINES.indexOf(a.line);
        const lineIndexB = LINES.indexOf(b.line);
        if (lineIndexA !== lineIndexB) return lineIndexA - lineIndexB;
        return b.hours - a.hours;
      });
  }, [eqData]);

  const lineRowCount = useMemo(() => {
    return tableRows.reduce((acc, row) => {
      acc[row.line] = (acc[row.line] || 0) + 1;
      return acc;
    }, {});
  }, [tableRows]);

  const maxHours = tableRows.length > 0 ? Math.max(...tableRows.map((r) => r.hours)) : 1;

  const getBgColor = (hours) => {
    const ratio = hours / maxHours;
    const alpha = 0.1 + ratio * 0.75;
    return `rgba(33, 150, 243, ${alpha.toFixed(2)})`;
  };

  const getTextColor = (hours) => {
    const ratio = hours / maxHours;
    return ratio > 0.6 ? '#ec212f' : '#1a1a2e';
  };

  if (tableRows.length === 0) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100 text-muted">
        尚無資料
      </div>
    );
  }

  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      <table className="table table-sm mb-0" style={{ fontSize: '0.82rem' }}>
        <thead className="table-dark sticky-top">
          <tr>
            <th style={{ width: '22%' }}>Line</th>
            <th style={{ width: '40%' }}>Status</th>
            <th style={{ width: '38%', textAlign: 'center' }}>累計時間 (h)</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            const seenLines = new Set();
            return tableRows.map((row, idx) => {
              const showLineCell = !seenLines.has(row.line);
              if (showLineCell) seenLines.add(row.line);

              return (
                <tr key={idx} style={{ backgroundColor: getBgColor(row.hours) }}>
                  {showLineCell && (
                    <td
                      rowSpan={lineRowCount[row.line]}
                      style={{ color: getTextColor(row.hours), fontWeight: 600, verticalAlign: 'middle' }}
                    >
                      {row.line}
                    </td>
                  )}
                  <td style={{ color: getTextColor(row.hours) }}>{row.status}</td>
                  <td style={{ color: getTextColor(row.hours), textAlign: 'center', fontWeight: 600 }}>
                    {row.hours}
                  </td>
                </tr>
              );
            });
          })()}
        </tbody>
      </table>
    </div>
  );
};

export default StatusHeatTable;
