// server/routes/businessRoutes.js
import express from "express";
import { authRequired } from "../middleware/authMiddleware.js";
import { registerBusiness, getMyShop, getRepairDetails } from "../controllers/businessController.js";

const router = express.Router();

router.post("/business-register", authRequired, registerBusiness);
router.get("/my-shop", authRequired, getMyShop);

export default router;
