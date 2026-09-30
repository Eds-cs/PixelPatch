import express from "express";
import { createReview } from "../controllers/clientReviewController.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/reviews", authRequired, createReview);

export default router;
