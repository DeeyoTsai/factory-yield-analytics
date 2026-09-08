// 未結批資料整批刪除重建（Dave 決策：不留歷史，更新 = destroy CASCADE 後重抓重建）
const { UnfinishLot, UnfinishDefect, UnfinishDefectDetail } = require('../models');
const sequelize = require('../config/database');

/**
 * 以 lotno 為單位整批重建資料鏈。
 * 回傳 { lotId, defectIdByCode }，defectIdByCode 供 TrendChart 掛 unfinish_defect_id 用。
 * destroy/create 全部包進 transaction 保證原子性。
 */
async function replaceUnfinishLot({ lotRow, day, defects, detailsByCode = {} }) {
  return sequelize.transaction(async (t) => {
    // 1. 舊資料整批清除：CASCADE 連動 unfinish_defects → unfinish_defect_details → trend_charts(unfinish_defect_id)
    await UnfinishLot.destroy({ where: { lotno: lotRow.lotno }, transaction: t });

    // 2. 重建 lot
    const lot = await UnfinishLot.create({ ...lotRow, day }, { transaction: t });

    // 3. 重建 defects，收集 detail_code → id 對照
    const defectIdByCode = {};
    for (const d of defects) {
      const created = await UnfinishDefect.create({
        unfinishlot_id: lot.id,
        process: d.process, defectcode: d.defectcode, qty: d.qty,
        detail_code: d.detail_code, product: d.product,
      }, { transaction: t });
      if (d.detail_code) defectIdByCode[d.detail_code] = created.id;
    }

    // 4. 重建 glass 明細（僅門檻入選的 defect 有資料）
    for (const [code, rows] of Object.entries(detailsByCode)) {
      const defectId = defectIdByCode[code];
      if (!defectId || !rows.length) continue;
      await UnfinishDefectDetail.bulkCreate(rows.map((r) => ({
        unfinish_defect_id: defectId,
        glassid: r.glassid, p_no: r.p_no, defect_name: r.defect_name,
        x: r.x, y: r.y, defect_group: r.defect_group, product: r.product,
        tedt: r.tedt, img_url_1: r.img_url_1 || r.img_row || null, img_url_2: r.img_url_2 || null,
      })), { transaction: t });
    }

    return { lotId: lot.id, defectIdByCode };
  });
}

module.exports = { replaceUnfinishLot };
