const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const RgbTopFive = require('./RgbTopFive');
const Pdamtable = require('./Pdamtable');
const OvenSlot = require('./OvenSlot');
const ReworkHis = require('./ReworkHis');
const AdiRecord = require('./AdiRecord');

const GlassInfo = sequelize.define('GlassInfo', {
  gid: {
    type: DataTypes.STRING(15),
    allowNull: false,
  },
  xpos: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  ypos: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  inspectstops: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  dfcode: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  week: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  month: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  firststop: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  // 畫像1／畫像2：2026-08-15 起改存 外部影像伺服器的直連 URL（不再下載到本機）。
  // 歷史資料的 img 仍是資料匯入當年存檔的本機絕對路徑，前端 resolveDefectImgSrc() 兩種都認。
  img: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  img2: {
    type: DataTypes.STRING(255),
    allowNull: true,
  }
}, {
  // tableName: 'glass_infos',
  timestamps: true,
  // createdAt: 'created',
  // updatedAt: false,
});

GlassInfo.belongsTo(RgbTopFive, { foreignKey: 'rgbtopfive_id', as: 'rgbtopfive', onDelete:'CASCADE' });
RgbTopFive.hasMany(GlassInfo, { foreignKey: 'rgbtopfive_id', as: 'glassinfos', onDelete:'CASCADE' });

GlassInfo.belongsTo(Pdamtable, { foreignKey: 'pdamtable_id', as: 'pdamtable',onDelete:'CASCADE' });
Pdamtable.hasMany(GlassInfo, { foreignKey: 'pdamtable_id', as: 'glassinfos',onDelete:'CASCADE' });

GlassInfo.belongsTo(OvenSlot, { foreignKey: 'ovenslot_id', as: 'ovenslot'});
OvenSlot.hasOne(GlassInfo, { foreignKey: 'ovenslot_id', as: 'glassinfos'});

GlassInfo.belongsTo(ReworkHis, { foreignKey: 'reworkhis_id', as: 'reworkhis' });
ReworkHis.hasOne(GlassInfo, { foreignKey: 'reworkhis_id', as: 'glassinfos' });

GlassInfo.belongsTo(AdiRecord, { foreignKey: 'adirecord_id', as: 'adirecord' });
AdiRecord.hasOne(GlassInfo, { foreignKey: 'adirecord_id', as: 'glassinfos' });

module.exports = GlassInfo;
