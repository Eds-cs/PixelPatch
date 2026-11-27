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

import {
  inviteEmployee,
  cancelInvite,
  removeEmployeeAccess,
  openRepairChat,
  transferChat,
  takeBackChat,
} from "../../controllers/business/staffAccessController.js";
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

// Sign-in access for employees (controllers/business/staffAccessController.js)
router.post("/employees/:id/invite", limitText({ email: ["Email", LIMITS.email] }), inviteEmployee);
router.delete("/employees/:id/invite", cancelInvite);
router.post("/employees/:id/remove-access", removeEmployeeAccess);

// Repair chats: open, hand to the assigned employee, take back
router.post("/repairs/:id/chat", openRepairChat);
router.post("/chats/:id/transfer", transferChat);
router.post("/chats/:id/take-back", takeBackChat);

/* ==============================
   REQUEST ASSIGNMENT
============================== */
router.post("/repairs/:id/assign", assignEmployeeToRequest);
router.get("/repairs/:id/assignment", getAssignmentForRequest);

export default router;
