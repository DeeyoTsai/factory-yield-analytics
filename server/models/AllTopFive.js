const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const AllTopFive = sequelize.define(
  "AllTopFive",
  {
    stop: {
      type: DataTypes.STRING(10),
      allowNull: true,
    },
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
  },
  {
    // tableName: "all_top_fives",
    timestamps: true,
    // createdAt: "created",
    // updatedAt: "updated",
  },
);

module.exports = AllTopFive;
