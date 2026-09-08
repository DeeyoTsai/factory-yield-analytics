const { Sequelize } = require("sequelize");
const sequelize = require("../config/database");

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.users = require("./user-model")(sequelize, Sequelize);
db.fmatbs = require("./fma-model")(sequelize, Sequelize);
db.outlines = require("./fma-outline-model")(sequelize, Sequelize);
db.imagetbs = require("./image-model")(sequelize, Sequelize);
db.ShtSmlCount = require("./shtSmlCount")(sequelize, Sequelize);

// (async ()=>{
//   await db.ShtSmlCount.sync({force:false});
//   console.log('新table建立');
  
// })();

// db.users.hasMany(db.fmatbs, {
//   foreignKey: {
//     sourceKey: "employee",
//     foreignKey: "id",
//   },
// });

// db.users.hasMany(db.fmatbs, {
//   foreignKey: "fmaEmployee",
//   sourceKey: "employee",
// });

// db.fmatbs.belongsTo(db.users, {
//   foreignKey: "fmaEmployee",
//   sourceKey: "employee",
// });

db.users.hasMany(db.outlines, {
  foreignKey: "emp",
  sourceKey: "employee",
  constraints: false
});
db.outlines.belongsTo(db.users, {
  foreignKey: "emp",
  targetKey: "employee",
  constraints: false
});

// db.outlines.hasMany(db.fmatbs);
db.outlines.hasMany(db.fmatbs, { onDelete: "cascade" });
db.fmatbs.belongsTo(db.outlines);

db.users.hasMany(db.imagetbs, {
  foreignKey: "emp",
  sourceKey: "employee",
  constraints: false
});
db.imagetbs.belongsTo(db.users, { foreignKey: "emp", targetKey: "employee", constraints: false });


// === Yield System Modern Models ===
db.OvenSlot = require('./OvenSlot');
db.ReworkHis = require('./ReworkHis');
db.AdiRecord = require('./AdiRecord');
db.RgbTopFive = require('./RgbTopFive');
db.AllTopFive = require('./AllTopFive');
db.Pdamtable = require('./Pdamtable');
db.GlassInfo = require('./GlassInfo');
db.EqAction = require('./EqAction');
db.HourlyDefect = require('./HourlyDefect');
db.OverDefectDetail = require('./OverDefectDetail');
db.TrendChart = require('./TrendChart');
db.UnfinishLot = require('./UnfinishLot');
db.UnfinishDefect = require('./UnfinishDefect');
db.UnfinishDefectDetail = require('./UnfinishDefectDetail');
db.EdcRecord = require('./EdcRecord');
db.EdcSegment = require('./EdcSegment');
db.EdcFlaggedGlass = require('./EdcFlaggedGlass');
db.EdcGlassComment = require('./EdcGlassComment');
db.EdcGlassRecord = require('./EdcGlassRecord');

// Yield System Associations
db.HourlyDefect.hasMany(db.OverDefectDetail, { foreignKey: 'hourlydefectId' });
db.OverDefectDetail.belongsTo(db.HourlyDefect, { foreignKey: 'hourlydefectId' });

module.exports = db;
