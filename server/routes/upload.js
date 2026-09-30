import express from "express";
import { upload, uploadPhoto } from "../controllers/uploadController.js";

const router = express.Router();

router.post("/photo", upload, uploadPhoto);

export default router;
