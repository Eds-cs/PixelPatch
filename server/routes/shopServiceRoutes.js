// server/routes/shopServiceRoutes.js
import express from "express";
import { getServiceCategories, getShopServiceTypes } from "../controllers/shopServiceController.js";

const router = express.Router();

router.get("/categories", getServiceCategories);
router.get("/types/:shop_id", getShopServiceTypes);
export default router;
