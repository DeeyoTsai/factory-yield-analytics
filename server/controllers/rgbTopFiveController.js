const { AllTopFive, RgbTopFive } = require("../models");
const { Op } = require("sequelize");

// Get All Top 5 Defects for a specific day
exports.getAllTopFive = async (req, res) => {
  try {
    const { day } = req.query;
    if (!day) {
      return res
        .status(400)
        .json({ message: "Day parameter is required (YYYY-MM-DD)" });
    }

    const results = await AllTopFive.findAll({
      where: { day: day },
      order: [["quantity", "DESC"]],
      limit: 5,
    });

    res.status(200).json({ results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get RGB Top 5 Defects (Currently same logic, but reserved for specific filtering)
exports.getRgbTopFive = async (req, res) => {
  try {
    console.log("=== 進入 getRgbTopFive ===");
    console.log("RgbTopFive Model 是否存在？", !!RgbTopFive);
    const { day } = req.query;
    if (!day) {
      return res
        .status(400)
        .json({ message: "Day parameter is required (YYYY-MM-DD)" });
    }

    const results = await RgbTopFive.findAll({
      where: { day: day },
      order: [["quantity", "DESC"]],
      limit: 5,
    });

    res.status(200).json({ results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
