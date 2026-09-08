const { DataTypes } = require("sequelize");
// models/ShtSmlCount.js
module.exports = (sequelize, DataTypes) => {
  const ShtSmlCount = sequelize.define("ShtSmlCount", 
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      gid: {
        type: DataTypes.STRING(15),
        allowNull: false
      },
      ln: {
        type: DataTypes.STRING(10),
        allowNull: false
      },
      s: DataTypes.SMALLINT.UNSIGNED,
      m: DataTypes.SMALLINT.UNSIGNED,
      l: DataTypes.SMALLINT.UNSIGNED,
      total: DataTypes.SMALLINT.UNSIGNED
    },
    {
    //   tableName: 'sht_sml_count',
      timestamps: true,
      charset: 'utf8mb4'
    }
  );

  return ShtSmlCount;
};