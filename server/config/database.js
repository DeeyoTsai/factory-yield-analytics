const { Sequelize } = require("sequelize");

// 連線資訊全部走環境變數（server/.env，見 .env.example）。
const sequelize = new Sequelize(
  process.env.DB_NAME || "fma_yield",
  process.env.DB_USER || "root",
  process.env.DB_PASSWORD || "",
  {
    host: process.env.DB_HOST || "127.0.0.1",
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    dialect: process.env.DB_DIALECT || "mysql",
    timezone: process.env.DB_TIMEZONE || "+08:00",
    logging: process.env.DB_LOGGING === "true" ? console.log : false,
    pool: {
      max: Number(process.env.DB_POOL_MAX || 20),
      min: Number(process.env.DB_POOL_MIN || 0),
      acquire: Number(process.env.DB_POOL_ACQUIRE || 30000),
      idle: Number(process.env.DB_POOL_IDLE || 10000),
    },
  }
);

module.exports = sequelize;
