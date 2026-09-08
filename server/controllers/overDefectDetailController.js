const { OverDefectDetail } = require('../models');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

exports.getOverDefectDetails = async (req, res) => {
  try {
    const { day, line, hour, gid } = req.query;
    const where = {};

    // if (line) {
    //   where.stop = line;
    // }

    // if (gid) {
    //   where.gid = gid;
    // }

    // // 用 DATE(dt) 篩日期，避免需要 hourlydefectId JOIN
    // const andClauses = [];
    // if (day) {
    //   andClauses.push(
    //     sequelize.where(sequelize.fn('DATE', sequelize.col('dt')), day)
    //   );
    // }

    if (day && line && hour){
      const dt = day.replace(/-/g, '/'); // 將日期中的 '-' 替換為 '/'
      where.lineDtHr = {
        [Op.like]: `${line}-${dt}-${hour}%`
      };
    }

    // // hour 從前端傳來是字串 "08"，HOUR(dt) 回整數，轉為整數比對
    // if (hour !== undefined && hour !== '') {
    //   andClauses.push(
    //     sequelize.where(sequelize.fn('HOUR', sequelize.col('dt')), parseInt(hour, 10))
    //   );
    // }

    // if (andClauses.length > 0) {
    //   where[Op.and] = andClauses;
    // }

    const details = await OverDefectDetail.findAll({
      where,
      order: [['dt', 'ASC']],
    });
    res.json({ results: details });
  } catch (error) {
    console.error('Error fetching over defect details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
