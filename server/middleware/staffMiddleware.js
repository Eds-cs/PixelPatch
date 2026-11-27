// middleware/staffMiddleware.js
// The staff portal (routes/staff.js): the caller must be a joined, active
// employee of a verified shop whose owner isn't suspended (utils/staff.js).
// Sets req.staff = { employeeId, shopId, shopName, firstName, role, ownerId }.
import { membershipFor } from "../utils/staff.js";

export const staffRequired = async (req, res, next) => {
  try {
    const membership = await membershipFor(req.user?.id);
    if (!membership) {
      return res.status(403).json({ message: "You're not a member of a shop.", code: "NOT_STAFF" });
    }
    if (!membership.usable) {
      return res.status(403).json({ message: "Your shop isn't available on PixelPatch right now.", code: "SHOP_UNAVAILABLE" });
    }
    req.staff = membership;
    return next();
  } catch (err) {
    console.error("staff check failed:", err.code || err.message);
    return res.status(500).json({ message: "Unable to verify staff access" });
  }
};
