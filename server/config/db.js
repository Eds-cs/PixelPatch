import mysql from "mysql2";
import dotenv from "dotenv";
dotenv.config({ path: "./server/.env" });

console.log("DB DEBUG:", {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  passwordIsEmpty: process.env.DB_PASS === "",
  passwordLength: process.env.DB_PASS?.length,
  database: process.env.DB_NAME,
});

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

db.connect(err => {
  if (err) console.error("DB ERROR:", err);
  else console.log("MySQL Connected");
});

export default db;


