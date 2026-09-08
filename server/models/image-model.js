const { DataTypes } = require("sequelize");
// const { sequelize, Sequelize } = require(".");

module.exports = (sequelize, Sequelize) => {
  const imagetb = sequelize.define("imagetb", {
    line: {
      type: DataTypes.STRING(5),
    },
    gid: {
      type: DataTypes.STRING(11),
      allowNull: false,
      validate: {
        // min: 5,
        notNull: true,
        notEmpty: true,
      },
    },
    lot: {
      type: DataTypes.STRING(7),
      allowNull: false,
    },
    datetime: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    xpos: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    ypos: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    ori_img_path: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    pred_img_path: {
      type: DataTypes.STRING(255),
      //   allowNull: false,
    },
    txt_path: {
      type: DataTypes.STRING(255),
    },
    pred_result: {
      // 使用 TEXT('long') 以支援較長的 JSON 或預測字串（對應 MySQL LONGTEXT）
      type: DataTypes.TEXT,
    },
    manual_result: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    check_flag: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    show_flag: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    show_pos: {
      type: DataTypes.INTEGER,
      defaultValue: -1,
    },
    emp: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
  });
  return imagetb;
};
