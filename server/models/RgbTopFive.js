const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const RgbTopFive = sequelize.define(
  "RgbTopFive",
  {
    dfcode: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    day: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    ratio: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
    },
    detail_link: {
      type: DataTypes.STRING, // 或 DataTypes.TEXT
      allowNull: true,
    },
  },
  {
    // tableName: "rgb_top_fives",
    timestamps: true,
    // createdAt: "created",
    // updatedAt: "updated",
  },
);

module.exports = RgbTopFive;
