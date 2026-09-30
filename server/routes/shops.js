import express from "express";
import { getShopById } from "../controllers/shopController.js";

const router = express.Router();

router.get("/:id", getShopById);

export default router;
