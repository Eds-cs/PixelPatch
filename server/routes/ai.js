import express from "express";
import { analyzeIssue } from "../controllers/aiController.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/analyze", authRequired, analyzeIssue);
export default router;
