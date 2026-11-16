// middleware/adminMiddleware.js
// Admin-only routes. Use after authRequired.
//
// The JWT's role_id is checked against the users table on every request, so a
// demoted admin loses access immediately instead of when their 7-day token
// expires. Role IDs (verified in user_roles): 1 = user, 2 = admin, 3 = business.
import db from "../config/db.js";

export const ADMIN_ROLE_ID = 2;

export const adminRequired = async (req, res, next) => {
  if (Number(req.user?.role_id) !== ADMIN_ROLE_ID) {
    return res.status(403).json({ message: "Admin access only" });
  }

  try {
    const [[user]] = await db.promise().query(
      "SELECT role_id FROM users WHERE id = ? LIMIT 1",
      [req.user.id]
    );

    if (!user || Number(user.role_id) !== ADMIN_ROLE_ID) {
      return res.status(403).json({ message: "Admin access only" });
    }

    return next();
  } catch (error) {
    console.error("Admin authorization lookup failed:", { code: error.code });
    return res.status(500).json({ message: "Unable to verify admin access" });
  }
};
