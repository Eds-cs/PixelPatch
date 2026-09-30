import express from "express";
import { getShopDocuments } from "../controllers/documentController.js";

const router = express.Router();

router.get("/:id/documents", getShopDocuments);

export default router;
