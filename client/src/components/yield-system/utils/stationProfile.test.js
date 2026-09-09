import { buildStationProfile, STATIONS } from './stationProfile';

const row = (over = {}) => ({ firststop: 'L3', inspectstops: 'L3', reworkhis: null, ...over });
const pick = (p, station) => p.rows.find((r) => r.station === station);

describe('buildStationProfile', () => {
  test('firststop 的 Offline_AOI 與 inspectstops 的 AOI 要歸到同一列', () => {
    // ⚠️ 同一台機 AOI-02：erinToLine→'AOI'、firstStopOrder→'Offline_AOI'
    const p = buildStationProfile([
      row({ firststop: 'Offline_AOI', inspectstops: 'AOI' }),
    ]);
    expect(pick(p, 'AOI')).toMatchObject({ firstCount: 1, detectedCount: 1 });
    expect(p.othersTotal).toBe(0); // 不可被當成 9 站之外
  });

  test('firststop 落在 9 站之外的歸「其他」，不進 9 站', () => {
    const p = buildStationProfile([
      row({ firststop: 'Unknown', inspectstops: '' }),
      row({ firststop: 'Unknown', inspectstops: '' }),
      row({ firststop: 'OC2', inspectstops: '' }),
    ]);
    expect(p.othersTotal).toBe(3);
    expect(p.others).toEqual([{ name: 'Unknown', count: 2 }, { name: 'OC2', count: 1 }]);
    expect(p.rows.every((r) => r.firstCount === 0)).toBe(true);
  });

  test('眾數要用未正規化的原始值，才能重現爬蟲的 topFs', () => {
    // 爬蟲吃 firststop 原值後 topFs.slice(-1) 取末字：'Offline_AOI' → 'I' → process 'BI'（垃圾值）。
    // 這裡若先正規化成 'AOI' 再算眾數，說明列就會與爬蟲實際用的字串不符。
    const p = buildStationProfile([
      row({ firststop: 'Offline_AOI', inspectstops: 'AOI' }),
      row({ firststop: 'Offline_AOI', inspectstops: 'AOI' }),
      row({ firststop: 'L3', inspectstops: 'L3' }),
    ]);
    expect(p.firstStopMode).toBe('Offline_AOI');   // 不可以是 'AOI'
    expect(pick(p, 'AOI').firstCount).toBe(2);     // 但分列仍要正規化進 AOI
  });

  test('眾數要涵蓋 Unknown —— 重現爬蟲會算出垃圾 process 的情境', () => {
    // 爬蟲的 fsCount 沒排除 Unknown，Unknown 成為眾數時 topFs.slice(-1) 會得到 'n'
    const p = buildStationProfile([
      row({ firststop: 'Unknown' }), row({ firststop: 'Unknown' }), row({ firststop: 'L3' }),
    ]);
    expect(p.firstStopMode).toBe('Unknown');
  });

  test('inspectstops 空字串不可產生空站名，逗號字串要逐站計數', () => {
    const p = buildStationProfile([
      row({ firststop: 'BM1', inspectstops: 'BM1,L1,L3' }),
      row({ firststop: 'BM1', inspectstops: '' }),
    ]);
    expect(pick(p, 'BM1')).toMatchObject({ firstCount: 2, detectedCount: 1 });
    expect(pick(p, 'L1').detectedCount).toBe(1);
    expect(pick(p, 'L3').detectedCount).toBe(1);
    expect(p.rows).toHaveLength(STATIONS.length);
  });

  test('reworkhis 的 -1（無資料）不可被加總，正值要累加', () => {
    const p = buildStationProfile([
      row({ reworkhis: { bm1: -1, bm2: -1, l1: 2, l4: -1, l2: -1, l5: -1, l3: 1, l6: -1 } }),
      row({ reworkhis: { bm1: -1, bm2: -1, l1: 3, l4: -1, l2: -1, l5: -1, l3: 0, l6: -1 } }),
      row({ reworkhis: null }),
    ]);
    expect(pick(p, 'L1').rework).toBe(5);
    expect(pick(p, 'L3').rework).toBe(1);
    expect(pick(p, 'BM1').rework).toBe(0); // 全是 -1 → 0，不可變成 -2
  });

  test('比例尺取「有檢出」與「第一檢出」的最大值，且不會是 0（避免除以零）', () => {
    expect(buildStationProfile([]).maxDetected).toBe(1);
    const p = buildStationProfile([
      row({ firststop: 'L2', inspectstops: 'L2,L3' }),
      row({ firststop: 'L3', inspectstops: 'L3' }),
    ]);
    expect(p.maxDetected).toBe(2);
    expect(p.totalGlass).toBe(2);
  });

  test('沒有 glass 時回傳 9 個歸零列而不是空陣列', () => {
    const p = buildStationProfile([]);
    expect(p.rows).toHaveLength(9);
    expect(p.rows.every((r) => r.firstCount === 0 && r.detectedCount === 0)).toBe(true);
    expect(p.firstStopMode).toBeNull();
  });
});
