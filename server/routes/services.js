import express from "express";
import { getShopServices } from "../controllers/serviceController.js";

const router = express.Router();

router.get("/:id/services", getShopServices);

export default router;
