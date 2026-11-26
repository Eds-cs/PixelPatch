import express from "express";
import { analyzeIssue, recommendShops, setFeedback } from "../controllers/aiController.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = express.Router();

// Each message is checked against per-user limits in the controller
// (utils/ai/limits.js): 20 per 10 minutes, 100 per day.
router.post("/analyze", authRequired, analyzeIssue);
router.post("/shops", authRequired, recommendShops);
router.put("/messages/:id/feedback", authRequired, setFeedback);
export default router;
