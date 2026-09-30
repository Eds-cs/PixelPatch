import express from "express";
import { handleXenditWebhook } from "../../controllers/xenditWebhookController.js";

const router = express.Router();

// Xendit webhook endpoint
router.post("/xendit", handleXenditWebhook);

export default router;
