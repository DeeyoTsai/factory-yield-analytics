// const { sequelize, Sequelize } = require(".");
const { DataTypes } = require("sequelize");

module.exports = (sequelize, Sequelize) => {
  const outline = sequelize.define("outline", {
    emp: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        min: 5,
        notNull: true,
        notEmpty: true,
      },
    },
    line: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        min: 2,
        max: 5,
      },
    },
    product: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        min: 4,
        max: 20,
      },
    },
    lot: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    first: {
      type: DataTypes.STRING,
    },
    second: {
      type: DataTypes.STRING,
    },
    third: {
      type: DataTypes.STRING,
    },
    datetime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    comment: {
      type: DataTypes.TEXT,
    },
    drag_slots: {
      type: DataTypes.JSON,
    },
  });
  return outline;
};
