import express from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/usersController.js";
import { authRequired } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authRequired, getUsers);
router.get("/:id", authRequired, getUserById);
router.post("/", authRequired, createUser);
router.put("/:id", authRequired, updateUser);
router.delete("/:id", authRequired, deleteUser);

export default router;
