import dotenv from "dotenv";
dotenv.config();

export default {
    HOST: process.env.DB_HOST || "localhost",
    USER: process.env.DB_USER || "root",
    PASSWORD: process.env.DB_PASSWORD || "123456",
    DB: process.env.DB_NAME || "chf_db",
    dialect: process.env.DB_DIALECT || "mysql",
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      useUTC: true, //for reading from database
      dateStrings: true,
    },
};