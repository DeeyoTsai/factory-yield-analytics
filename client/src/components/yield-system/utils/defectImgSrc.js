// defect 照片路徑正規化（雙軌相容）。
//
// GlassInfo.img / img2 有兩種來源，同一張表裡新舊資料會並存：
//   1. 2026-08-15 起：EIS 圖片伺服器直連 URL（'http://...'），爬蟲不再下載到本機
//   2. 之前的歷史資料：爬蟲存檔時的**本機絕對路徑**，含 Windows 反斜線
//      （圖片實體又曾從 client/public 搬到 client/media，所以 marker 有兩種）
// 未結批（UnfinishDefectDetail.img_url_1/2）一律是第 1 種，可以直接用不必經過這裡。

// 爬蟲取不到圖時寫進 DB 的佔位值
const PLACEHOLDERS = new Set(['NA', 'NoImg.jpg', 'null', 'undefined']);

/**
 * @param {string|null|undefined} raw DB 裡的 img / img2 原值
 * @returns {string|null} 可直接餵給 <img src> 的字串；無圖時回 null（呼叫端據此顯示「無圖」）
 */
export function resolveDefectImgSrc(raw) {
  if (!raw) return null;
  const v = String(raw).trim();
  if (!v || PLACEHOLDERS.has(v)) return null;

  // 新資料：EIS 直連 URL，原樣使用。**不可以再往下走 marker 切割**，
  // 否則 'http://...' 會被 split('public') 切爛。
  if (/^https?:\/\//i.test(v)) return v;

  // 歷史資料：取 media（新）或 public（舊）marker 之後的尾巴組相對 URL，
  // 由 server/index.js 的 express.static(client/media) + (client/public) 服務，DB 免 migration。
  const normalized = v.replaceAll('\\', '/');
  const marker = normalized.includes('media') ? 'media' : 'public';
  const tail = normalized.split(marker)[1] || normalized;

  // 舊的 getImageAndSave() 沿用遠端原檔名，部分沒有副檔名 → 補 .jpg
  return /\.\w+$/.test(tail) ? `.${tail}` : `.${tail}.jpg`;
}

export default resolveDefectImgSrc;
