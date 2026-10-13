// routes/business/employeeRoutes.js
import express from "express";
import {
  createEmployee,
  getEmployees,
  assignEmployeeToRequest,
  getAssignmentForRequest
} from "../../controllers/business/employeeController.js";

import { authRequired } from "../../middleware/authMiddleware.js";
import { businessShopRequired } from "../../middleware/businessShopMiddleware.js";

const router = express.Router();
router.use(authRequired, businessShopRequired);

/* ==============================
   EMPLOYEE MANAGEMENT
============================== */
router.post("/employees", createEmployee);
router.get("/employees", getEmployees);

/* ==============================
   REQUEST ASSIGNMENT
============================== */
router.post("/repairs/:id/assign", assignEmployeeToRequest);
router.get("/repairs/:id/assignment", getAssignmentForRequest);

export default router;
