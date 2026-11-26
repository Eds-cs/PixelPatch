import express from "express";
import { upload, uploadPhoto } from "../controllers/uploadController.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = express.Router();

// Signed-in users only (it used to accept anyone).
router.post("/photo", authRequired, upload, uploadPhoto);

export default router;
