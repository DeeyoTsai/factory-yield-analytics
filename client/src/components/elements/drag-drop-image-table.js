import React, { useState, useEffect } from "react";
import { useDashboard } from "../../contexts/DashboardContext";

const fixImgPath = (path) => {
  if (!path) return "";
  if (path.includes("client")) {
    return "./" + path.split("/").slice(3).join("/");
  }
  return path;
};

const DragDropImageTable = ({ sortedDfArr, images = [], initialSlots = null, onSlotsChange }) => {
  const [showRight, setShowRight] = useState(true);
  const [slots, setSlots] = useState({});
  const { transDefect } = useDashboard();

  const top3 = sortedDfArr.slice(0, 3);

  useEffect(() => {
    setSlots(
      top3.reduce((acc, df) => {
        acc[df] = initialSlots?.[df] ?? [null, null];
        return acc;
      }, {})
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedDfArr, initialSlots]);

  useEffect(() => {
    onSlotsChange?.(slots);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots]);

  const dfLabel = (df) => {
    const clean = df.replaceAll("-", "");
    return transDefect[clean] || clean;
  };

  const handleDragStart = (e, imgSrc) => {
    e.dataTransfer.setData("text/plain", imgSrc);
  };

  const handleDrop = (e, df, slotIdx) => {
    e.preventDefault();
    const imgSrc = e.dataTransfer.getData("text/plain");
    if (!imgSrc) return;
    setSlots((prev) => {
      const arr = [...(prev[df] ?? [null, null])];
      arr[slotIdx] = imgSrc;
      return { ...prev, [df]: arr };
    });
  };

  const handleDragOver = (e) => e.preventDefault();

  const clearSlot = (df, slotIdx) => {
    setSlots((prev) => {
      const arr = [...(prev[df] ?? [null, null])];
      arr[slotIdx] = null;
      return { ...prev, [df]: arr };
    });
  };

  return (
    <div style={{ marginBottom: "1rem" }}>
      <div className="d-flex justify-content-center align-items-center mb-2">
        <h4 className="card-title text-center fw-bold">前三大 Defect 代表圖</h4>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary position-absolute end-0 me-3"
          onClick={() => setShowRight((v) => !v)}
        >
          {showRight ? "隱藏圖片庫" : "顯示圖片庫"}
        </button>
      </div>

      <div className="d-flex gap-3 align-items-start">
        {/* ── Left: drop zone ── */}
        <div style={{ flex: 1, minWidth: 0, minHeight:150 }}>
          {top3.length === 0 ? (
            <div className="text-muted small text-center py-3">
              尚無 Defect 資料，請先填寫表單
            </div>
          ) : (
            <table
              className="table table-bordered text-center mb-0"
              style={{ tableLayout: "fixed" }}
            >
              <thead className="table-light">
                <tr>
                  {top3.map((df) => (
                    <th key={df} style={{ fontSize: "0.85rem" }}>
                      {dfLabel(df)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[0, 1].map((rowIdx) => (
                  <tr key={rowIdx}>
                    {top3.map((df) => {
                      const dropped = slots[df]?.[rowIdx];
                      return (
                        <td
                          key={df}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, df, rowIdx)}
                          style={{
                            height: "130px",
                            border: dropped
                              ? "2px solid #0d6efd"
                              : "2px dashed #adb5bd",
                            backgroundColor: dropped ? "transparent" : "#f8f9fa",
                            verticalAlign: "middle",
                            padding: "4px",
                            position: "relative",
                          }}
                        >
                          {dropped ? (
                            <>
                              <img
                                src={dropped}
                                alt="dropped"
                                style={{
                                  width: "100%",
                                  height: "235px",
                                  objectFit: "contain",
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => clearSlot(df, rowIdx)}
                                style={{
                                  position: "absolute",
                                  top: 3,
                                  right: 3,
                                  background: "rgba(0,0,0,0.55)",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: "50%",
                                  width: "20px",
                                  height: "20px",
                                  cursor: "pointer",
                                  fontSize: "13px",
                                  lineHeight: "1.1",
                                  padding: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                ×
                              </button>
                            </>
                          ) : (
                            <span className="text-muted" style={{ fontSize: "0.78rem" }}>
                              拖拉圖片至此
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Right: image pool ── */}
        {showRight && (
          <div
            style={{
              width: "550px",
              flexShrink: 0,
              maxHeight: "530px",
              overflowY: "auto",
              border: "1px solid #dee2e6",
              borderRadius: "6px",
              padding: "8px",
              backgroundColor: "#fff",
            }}
          >
            {images.length === 0 ? (
              <span className="text-muted small">按 Refresh 載入圖片</span>
            ) : (
              <div className="d-flex flex-wrap gap-1">
                {images.map((img, i) => {
                  const src = fixImgPath(img.ori_img_path);
                  return (
                    <img
                      key={i}
                      src={src}
                      alt={img.gid ?? `img-${i}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, src)}
                      title={img.gid}
                      style={{
                        width: "168px",
                        height: "140px",
                        objectFit: "cover",
                        cursor: "grab",
                        borderRadius: "4px",
                        border: "1px solid #dee2e6",
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DragDropImageTable;
