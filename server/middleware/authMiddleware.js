// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import { isSuspended, SUSPENDED_CODE, SUSPENDED_MESSAGE } from "../utils/accountStatus.js";

export const authRequired = async (req, res, next) => {
  const authHeader =
    req.headers.authorization || req.headers.Authorization;

  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token" });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }

  // A suspended account's sessions stop working (utils/accountStatus.js).
  if (await isSuspended(decoded.id)) {
    return res.status(401).json({ error: SUSPENDED_MESSAGE, code: SUSPENDED_CODE });
  }

  req.user = decoded;
  return next();
};
