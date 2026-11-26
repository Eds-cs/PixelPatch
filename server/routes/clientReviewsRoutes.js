import express from "express";
import { createReview } from "../controllers/clientReviewController.js";
import { authRequired } from "../middleware/authMiddleware.js";

import { LIMITS, limitText } from "../utils/inputLimits.js";

const router = express.Router();

router.post("/reviews", authRequired, limitText({ feedback: ["Feedback", LIMITS.reviewComment] }), createReview);

export default router;
