// routes/business/employeeRoutes.js
import express from "express";
import {
  createEmployee,
  getEmployees,
  assignEmployeeToRequest,
  getAssignmentForRequest
} from "../../controllers/business/employeeController.js";

import { authRequired } from "../../middleware/authMiddleware.js";

const router = express.Router();

/* ==============================
   EMPLOYEE MANAGEMENT
============================== */
router.post("/employees", authRequired, createEmployee);
router.get("/employees", authRequired, getEmployees);

/* ==============================
   REQUEST ASSIGNMENT
============================== */
router.post("/repairs/:id/assign", authRequired, assignEmployeeToRequest);
router.get("/repairs/:id/assignment", authRequired, getAssignmentForRequest);

export default router;
