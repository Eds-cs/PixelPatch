// server/routes/chat.js
import express from "express";
import {
  sendMessage,
  getMessages,
  getUserConversations
} from "../controllers/messageController.js";
import { startChat } from "../controllers/chatController.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get all conversations for logged-in user
router.get("/chat", authRequired, getUserConversations);

// Get messages for one conversation
router.get("/chat/:id/messages", authRequired, getMessages);

// Send a new message
router.post("/chat/send", authRequired, sendMessage);

// Start or get a chat
router.post("/chat/start", authRequired, startChat);

export default router;
