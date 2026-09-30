// server/routes/clientRepairsRoutes.js
import express from "express";
import {
  getClientRepairs,
  getClientRepairById,
  approveQuotation,
  cancelRequest,
} from "../controllers/clientRepairController.js";

import { authRequired } from "../middleware/authMiddleware.js";

const router = express.Router();

/* CLIENT REPAIRS */
router.get("/repairs", authRequired, getClientRepairs);
router.get("/repairs/:id", authRequired, getClientRepairById);
router.patch("/repairs/:id/approve", authRequired, approveQuotation);
router.patch("/repairs/:id/cancel", authRequired, cancelRequest);

export default router;
