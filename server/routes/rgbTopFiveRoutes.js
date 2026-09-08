const express = require("express");
const router = express.Router();
const rgbTopFiveController = require("../controllers/rgbTopFiveController");

// Route for All Top 5
router.get("/topFive", rgbTopFiveController.getAllTopFive);

// Route for RGB Top 5
router.get("/rgbtopfive", rgbTopFiveController.getRgbTopFive);

module.exports = router;
