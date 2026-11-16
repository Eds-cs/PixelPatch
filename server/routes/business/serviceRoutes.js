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

const router = express.Router();

router.get("/services", authRequired, businessShopRequired, listShopServices);
router.post("/services", authRequired, businessShopRequired, createShopService);
router.put("/services/:id", authRequired, businessShopRequired, updateShopService);
router.delete("/services/:id", authRequired, businessShopRequired, deleteShopService);

export default router;
