import express from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/usersController.js";
import { authRequired } from "../middleware/authMiddleware.js";

import { LIMITS, limitText } from "../utils/inputLimits.js";

const router = express.Router();

const USER_TEXT = limitText({
  first_name: ["First name", LIMITS.personName],
  middle_name: ["Middle name", LIMITS.personName],
  last_name: ["Last name", LIMITS.personName],
  email: ["Email", LIMITS.email],
  phone: ["Phone", LIMITS.phone],
  password: ["Password", LIMITS.password],
});

router.get("/", authRequired, getUsers);
router.get("/:id", authRequired, getUserById);
router.post("/", authRequired, USER_TEXT, createUser);
router.put("/:id", authRequired, USER_TEXT, updateUser);
router.delete("/:id", authRequired, deleteUser);

export default router;
