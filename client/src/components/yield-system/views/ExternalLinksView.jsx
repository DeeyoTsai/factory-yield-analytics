import React, { useState } from 'react';

// 範例：把常用的內部系統連結收在同一頁。接自己場域時把 url 換成實際位址。
const defaultLinks = [
  { category: '生產系統', title: '值班交接系統', description: '值班交接記錄', url: '#' },
  { category: '生產系統', title: '生產資訊入口', description: '各線即時產出／機況總覽', url: '#' },
  { category: '品質系統', title: '缺陷影像查詢', description: '影像伺服器 defect 影像', url: '#' },
  { category: '品質系統', title: '外觀異常聯絡單', description: '外觀異常通報／追蹤', url: '#' },
  { category: '設備管理', title: '設備點檢狀態', description: '各機台 PM／點檢進度', url: '#' },
  { category: '設備管理', title: '備品庫存查詢', description: '線邊倉／請購平台', url: '#' },
  { category: '知識庫', title: 'Recipe 參數履歷', description: '各機台生產參數版本', url: '#' },
  { category: '知識庫', title: '製程 SOP', description: '標準作業程序文件', url: '#' },
];



// 計算分組資料
const groupedLinks = defaultLinks.reduce((acc, item) => {
  const lastGroup = acc[acc.length - 1];
  if (lastGroup && lastGroup.category === item.category) {
    lastGroup.items.push(item);
  } else {
    acc.push({ category: item.category, items: [item] });
  }
  return acc;
}, []);

// const handleOpenFolder = (folderPath) => {
//   // Windows 環境
//   window.location.href = `file:///${folderPath.replace(/\\/g, '/')}`;
// };

const ExternalLinksView = () => {
  const [links] = useState(defaultLinks);

  return (
    <div className="container-fluid" style={{ padding: '2rem 2.5rem' }}>
      <h4 className="mb-4 fw-bold">其他超連結</h4>
      <div className="row justify-content-center">
        <div className="col-12 col-xl-8">
          <div className="card shadow-sm border-0">
            <div className="card-body p-0">
              <table className="table table-hover mb-0">
                <thead className="table-dark">
                  <tr>
                    <th style={{ width: '15%' }}>分類</th>
                    <th style={{ width: '25%' }}>標題</th>
                    <th style={{ width: '45%' }}>說明</th>
                    <th style={{ width: '15%', textAlign: 'center' }}>連結</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedLinks.map((group) => (
                    group.items.map((item, idx) => (
                      <tr key={`${group.category}-${idx}`}>
                        {idx === 0 && (
                          <td 
                            className="align-middle" 
                            rowSpan={group.items.length}
                            style={{ fontWeight: 'bold' }}
                          >
                            {group.category}
                          </td>
                        )}
                        <td className="align-middle">{item.title}</td>
                        <td className="align-middle">{item.description}</td>
                        <td className="align-middle text-center">
                          {item.url ? (
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">
                              Link
                            </a>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExternalLinksView;
