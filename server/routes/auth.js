import express from "express";
import { register, login, googleLogin,generateTestHash } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google-login", googleLogin);
router.get("/test/hash", generateTestHash);



export default router;
