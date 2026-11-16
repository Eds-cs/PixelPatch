// config/db.js
// Shared MySQL pool. Importing loadEnv here means the pool reads the right
// server/.env no matter which file is the entry point or what the working
// directory is.
import "../loadEnv.js";
import mysql from "mysql2";

// A pool replaces the old single connection: a dropped connection no longer
// takes the whole API down, and concurrent requests do not queue on one
// socket. `db.query(...)` and `db.promise().query(...)` work exactly as they
// did on the single connection. Each pooled query may run on a different
// connection, so anything that needs one connection — a transaction — must
// use utils/transaction.js withTransaction instead of sending BEGIN/COMMIT
// through db.query.
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

// Fail loudly at startup if the database is unreachable, like the old
// db.connect() did, without holding a connection open.
db.getConnection((err, connection) => {
  if (err) {
    console.error("DB ERROR:", err.code || err.message);
    return;
  }
  connection.release();
  console.log("MySQL Connected");
});

export default db;
