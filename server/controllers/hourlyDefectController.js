const { HourlyDefect } = require('../models');

exports.getHourlyDefectsByDay = async (req, res) => {
  try {
    const { day } = req.query;
    
    if (!day) {
      return res.status(400).json({ error: 'Day parameter is required' });
    }

    const results = await HourlyDefect.findAll({
      where: { day },
      order: [['created', 'DESC']] // Assuming we want the latest record for that day if duplicates exist, or just all of them
    });

    res.json({ results });
  } catch (error) {
    console.error('Error fetching hourly defects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
