// routes/business/serviceRoutes.js — mounted at /api/business
import express from "express";
import { authRequired } from "../../middleware/authMiddleware.js";
import { businessShopRequired } from "../../middleware/businessShopMiddleware.js";
import {
  listShopServices,
  createShopService,
  updateShopService,
  deleteShopService,
} from "../../controllers/business/serviceController.js";

import { LIMITS, limitText } from "../../utils/inputLimits.js";

const router = express.Router();

router.get("/services", authRequired, businessShopRequired, listShopServices);
const SERVICE_TEXT = limitText({
  name: ["Service name", LIMITS.serviceName],
  description: ["Description", LIMITS.serviceDescription],
  estimated_timeframe: ["Estimated turnaround", LIMITS.turnaround],
  custom_category: ["Device", LIMITS.customCategory],
});

router.post("/services", authRequired, businessShopRequired, SERVICE_TEXT, createShopService);
router.put("/services/:id", authRequired, businessShopRequired, SERVICE_TEXT, updateShopService);
router.delete("/services/:id", authRequired, businessShopRequired, deleteShopService);

export default router;
