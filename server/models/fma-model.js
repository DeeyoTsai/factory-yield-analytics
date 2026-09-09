const { DataTypes } = require("sequelize");
const { DEFECT_KEYS } = require("../config/defectTypes");

// 每片 glass 的 FMA 量測：一列 = 一片 glass，12 個缺陷欄位各記該類缺陷的數量。
// 缺陷欄位由 config/defectTypes.js 的 key 產生（scratch / particle / ...），
// 想改缺陷分類就改那張表。
module.exports = (sequelize, Sequelize) => {
  const defectColumns = {};
  for (const key of DEFECT_KEYS) {
    defectColumns[key] = { type: DataTypes.TINYINT.UNSIGNED, defaultValue: 0 };
  }

  const fmatb = sequelize.define("fmatb", {
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    gid: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notNull: true,
        notEmpty: true,
      },
    },
    ...defectColumns,
    // 缺陷點大小分佈：S(小) / M(中) / L(大)
    s: { type: DataTypes.SMALLINT.UNSIGNED },
    m: { type: DataTypes.SMALLINT.UNSIGNED },
    l: { type: DataTypes.SMALLINT.UNSIGNED },
    // 不在 12 類內的其他缺陷，自由格式陣列
    // 不在 12 類內的其他缺陷：陣列 [{ 名稱: 數量 }, ...]
    // 存成 JSON 字串（MariaDB 的 DataTypes.JSON 是 longtext），讀回一律正規化成陣列
    otherdf: {
      type: DataTypes.JSON,
      defaultValue: "[]",
      get() {
        let v = this.getDataValue("otherdf");
        if (typeof v === "string") {
          try { v = JSON.parse(v); } catch (_) { v = []; }
        }
        // 舊資料可能被雙重 stringify（"\"[]\"" -> "[]" 字串）
        if (typeof v === "string") {
          try { v = JSON.parse(v); } catch (_) { v = []; }
        }
        return Array.isArray(v) ? v : [];
      },
      set(value) {
        this.setDataValue(
          "otherdf",
          JSON.stringify(Array.isArray(value) ? value : [])
        );
      },
    },
  });
  return fmatb;
};
