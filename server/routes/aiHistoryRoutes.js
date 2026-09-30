import express from "express";
import { authRequired } from "../middleware/authMiddleware.js";
import {
  listConversations,
  getConversationMessages,
  deleteConversation,
  renameConversation
} from "../controllers/aiHistoryController.js";

const router = express.Router();

// Sidebar list
router.get("/conversations", authRequired, listConversations);

// Load messages when clicking a conversation
router.get(
  "/conversations/:id/messages",
  authRequired,
  getConversationMessages
);

// Delete conversation
router.delete("/conversations/:id", authRequired, deleteConversation);

// Rename conversation
router.put("/conversations/:id/rename", authRequired, renameConversation);

export default router;
