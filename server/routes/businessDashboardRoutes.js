import express from "express";
import { authRequired } from "../middleware/authMiddleware.js";
import { getBusinessDashboard } from "../controllers/businessDashboardController.js";

const router = express.Router();

router.get(
  "/dashboard",
  authRequired,
  getBusinessDashboard
);

export default router;
