const { Pdamtable } = require('../models');

exports.getPdamtableByRgbId = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ message: 'RgbTopFive ID is required' });
    }

    const results = await Pdamtable.findAll({
      where: { rgbtopfive_id: id },
      order: [['createdAt', 'DESC']] // or any specific order
    });

    res.status(200).json({ results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
