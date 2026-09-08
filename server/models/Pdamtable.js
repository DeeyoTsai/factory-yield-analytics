const { DataTypes, QueryTypes } = require('sequelize');
const sequelize = require('../config/database');
const RgbTopFive = require('./RgbTopFive');

const Pdamtable = sequelize.define('Pdamtable', {
  phase: {
    type: DataTypes.STRING(1),
    allowNull: true,
  },
  product: {
    type: DataTypes.STRING(30),
    allowNull: false,
  },
  qty: {
    type: DataTypes.INTEGER,
    defaultValue: -1,
  },
  chart1: {
    type: DataTypes.STRING(200),
    defaultValue: 'NA',
  },
  chart2: {
    type: DataTypes.STRING(200),
    defaultValue: 'NA',
  },
}, {
  tableName: 'pdamtables',
  timestamps: true,
  // createdAt: 'created',
  // updatedAt: false,
});

Pdamtable.belongsTo(RgbTopFive, { foreignKey: 'rgbtopfive_id', as: 'rgbtopfive', onDelete:'CASCADE' });
RgbTopFive.hasMany(Pdamtable, { foreignKey: 'rgbtopfive_id', as: 'pdamtables', onDelete: 'CASCADE' });

module.exports = Pdamtable;
