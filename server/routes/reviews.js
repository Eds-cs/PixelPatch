import express from "express";
import { getBusinessShopReviews, getShopReviews } from "../controllers/reviewController.js";
import { authRequired } from "../middleware/authMiddleware.js";
import { businessShopRequired } from "../middleware/businessShopMiddleware.js";

const router = express.Router();

router.get("/:id/reviews", getShopReviews);
router.get("/:id/reviews/details", authRequired, businessShopRequired, getBusinessShopReviews);

export default router;
