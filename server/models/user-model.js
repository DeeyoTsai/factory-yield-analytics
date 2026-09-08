const { DataTypes } = require("sequelize");
const bcryptjs = require("bcryptjs");
// const { not } = require("joi");

module.exports = (sequelize, Sequelize) => {
  const User = sequelize.define(
    "user",
    {
      // 部門代碼（由工號推導，見 utils/employeeValidation.js + config/departments.js）
      department: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: true,
          notEmpty: true,
          len: {
            args: [2, 20],
            msg: "部門代碼長度需介於 2 至 20",
          },
        },
      },
      employee: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        // primaryKey: true,
        // foreignKey: true,
        validate: {
          // min: 5,
          notNull: true,
          notEmpty: true,
          len: {
            args: [6, 10],
            msg: "工號長度必須介於6至10位之間",
          },
        },
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: {
          args: true,
          msg: "使用者名稱已重覆",
        },
        validate: {
          min: 1,
          max: 20,
        },
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: true,
          // min: 5,
          // max: 255,
          len: {
            args: [6, 255],
            msg: "密碼長度必須介於6至255位",
          },
        },
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notNull: true,
          isEmail: true,
        },
      },
      level: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "normal",
        validate: {
          isIn: {
            args: [["normal", "admin"]],
            msg: "level必須是normal或admin",
          },
        },
      },
    },
    {
      hooks: {
        beforeSave: async (user) => {
          // 只有當密碼欄位被修改時才進行加密，避免重複加密導致密碼永遠錯誤
          if (user.changed('password')) {
            console.log("正在經過User.beforeSave... 密碼已變更，進行加密。");
            const hashedValue = await bcryptjs.hash(user.password, 10);
            user.password = hashedValue;
          }
        },
      },
    }
  );

  User.prototype.comparePassword = async function (password) {
    try {
      const isMatch = await bcryptjs.compare(password, this.password);
      return isMatch;
    } catch (e) {
      console.error("密碼比對發生錯誤:", e);
      throw e;
    }
  };

  return User;
};
