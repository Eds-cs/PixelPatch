// routes/staff.js — mounted at /api/staff (controllers/staffController.js)
import express from "express";
import { authRequired } from "../middleware/authMiddleware.js";
import { staffRequired } from "../middleware/staffMiddleware.js";
import {
  getStaffMe,
  acceptInvite,
  declineInvite,
  listStaffRepairs,
  getStaffRepair,
  startStaffRepair,
  completeStaffRepair,
  confirmStaffCashBalance,
  requestStaffBalance,
} from "../controllers/staffController.js";

const router = express.Router();
router.use(authRequired);

router.get("/me", getStaffMe);
router.post("/invites/:id/accept", acceptInvite);
router.post("/invites/:id/decline", declineInvite);

router.get("/repairs", staffRequired, listStaffRepairs);
router.get("/repairs/:id", staffRequired, getStaffRepair);
router.post("/repairs/:id/start", staffRequired, startStaffRepair);
router.post("/repairs/:id/complete", staffRequired, completeStaffRepair);
router.post("/repairs/:id/balance/cash", staffRequired, confirmStaffCashBalance);
router.post("/repairs/:id/balance/request", staffRequired, requestStaffBalance);

export default router;
