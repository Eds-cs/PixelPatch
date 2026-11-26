// routes/business/employeeRoutes.js
import express from "express";
import {
  createEmployee,
  getEmployees,
  assignEmployeeToRequest,
  getAssignmentForRequest,
  getAllEmployees,
  updateEmployee,
  deactivateEmployee,
  reactivateEmployee
} from "../../controllers/business/employeeController.js";

import { authRequired } from "../../middleware/authMiddleware.js";
import { businessShopRequired } from "../../middleware/businessShopMiddleware.js";

import { LIMITS, limitText } from "../../utils/inputLimits.js";

const router = express.Router();
router.use(authRequired, businessShopRequired);

/* ==============================
   EMPLOYEE MANAGEMENT
============================== */
const EMPLOYEE_TEXT = limitText({
  firstName: ["First name", LIMITS.personName],
  lastName: ["Last name", LIMITS.personName],
  role: ["Role", LIMITS.employeeRole],
  phone: ["Phone", LIMITS.phone],
  email: ["Email", LIMITS.email],
});

router.post("/employees", EMPLOYEE_TEXT, createEmployee);
router.get("/employees", getEmployees);
router.get("/employees/all", getAllEmployees);
router.put("/employees/:id", EMPLOYEE_TEXT, updateEmployee);
router.post("/employees/:id/deactivate", deactivateEmployee);
router.post("/employees/:id/reactivate", reactivateEmployee);

/* ==============================
   REQUEST ASSIGNMENT
============================== */
router.post("/repairs/:id/assign", assignEmployeeToRequest);
router.get("/repairs/:id/assignment", getAssignmentForRequest);

export default router;
