import db from "../config/db.js";

export function resolveShopIdForUser(req, cb) {
  if (!req.user || !req.user.id) {
    return cb(null, null);
  }

  db.query(
    `SELECT id FROM shops WHERE user_id = ? LIMIT 1`,
    [req.user.id],
    (err, rows) => {
      if (err) return cb(err);
      if (!rows || rows.length === 0) return cb(null, null);

      cb(null, rows[0].id);
    }
  );
}
