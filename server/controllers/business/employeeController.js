// controllers/business/employeeController.js
import db from "../../config/db.js";
import { resolveShopIdForUser } from "../../utils/resolveShopIdForUser.js";
import { normalizePhone, PHONE_MESSAGE } from "../../utils/phone.js";


/* ======================================================
   CREATE EMPLOYEE
   POST /api/business/employees
====================================================== */

export const createEmployee = (req, res) => {
  resolveShopIdForUser(req, (err, shopId) => {
    if (err) {
      return res.status(500).json({
        step: "resolveShopIdForUser",
        err
      });
    }

    if (!shopId) {
      return res.status(404).json({
        step: "shopId",
        message: "Shop not found"
      });
    }

    const { error, values } = validateEmployee(req.body);
    if (error) return res.status(400).json({ message: error });

    db.query(
      `INSERT INTO shop_employees
       (shop_id, first_name, last_name, role, phone, email, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`,
      [shopId, values.firstName, values.lastName, values.role, values.phone, values.email],
      (err, result) => {
        if (err) {
          return res.status(500).json({
            step: "db.query",
            code: err.code,
            sqlMessage: err.sqlMessage
          });
        }

        res.json({
          success: true,
          message: "Employee created",
          id: result.insertId
        });
      }
    );
  });
};


/* ======================================================
   GET EMPLOYEES (FOR DROPDOWN)
   GET /api/business/employees
====================================================== */
export const getEmployees = (req, res) => {
  resolveShopIdForUser(req, (err, shopId) => {
    if (err) {
      console.error("❌ resolveShopIdForUser error:", err);
      return res.status(500).json({ message: "Server error" });
    }

    if (!shopId) {
      return res.status(404).json({ message: "Shop not found" });
    }

    db.query(
      `SELECT id,
              first_name,
              last_name,
              role,
              phone,
              email,
              DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%s') AS created_at
       FROM shop_employees
       WHERE shop_id = ?
         AND is_active = 1
       ORDER BY first_name ASC`,
      [shopId],
      (err, rows) => {
        if (err) {
          console.error("❌ getEmployees DB error:", err);
          return res.status(500).json({ message: "Failed to fetch employees" });
        }

        res.json({ employees: rows });
      }
    );
  });
};

/* ======================================================
   ASSIGN EMPLOYEE TO REQUEST
   POST /api/business/repairs/:id/assign
====================================================== */
export const assignEmployeeToRequest = (req, res) => {
  const { id } = req.params; // service_requests.id
  const { employeeId } = req.body;

  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const assignedBy = req.user.id;

  resolveShopIdForUser(req, (err, shopId) => {
    if (err) {
      console.error("❌ resolveShopIdForUser error:", err);
      return res.status(500).json({ message: "Server error" });
    }

    if (!shopId) {
      return res.status(404).json({ message: "Shop not found" });
    }

    // 1️⃣ Verify request belongs to shop
    db.query(
      `SELECT id
              , decision
              , payment_status
              , status
       FROM service_requests
       WHERE id = ? AND shop_id = ?`,
      [id, shopId],
      (err, requestRows) => {
        if (err) {
          console.error("❌ request check error:", err);
          return res.status(500).json({ message: "Server error" });
        }

        if (requestRows.length === 0) {
          return res.status(403).json({ message: "Unauthorized request" });
        }

        if (
          requestRows[0].decision !== "ACCEPTED" ||
          requestRows[0].payment_status !== "PAID" ||
          ["IN_PROGRESS", "COMPLETED"].includes(requestRows[0].status)
        ) {
          return res.status(409).json({
            message: "A technician can be assigned after the client has paid and before repair starts"
          });
        }

        // 2️⃣ Verify employee belongs to shop
        db.query(
          `SELECT id
           FROM shop_employees
           WHERE id = ? AND shop_id = ? AND is_active = 1`,
          [employeeId, shopId],
          (err, employeeRows) => {
            if (err) {
              console.error("❌ employee check error:", err);
              return res.status(500).json({ message: "Server error" });
            }

            if (employeeRows.length === 0) {
              return res.status(400).json({ message: "Invalid employee" });
            }

            // 3️⃣ Insert or update assignment
            db.query(
              `INSERT INTO request_assignments
               (request_id, employee_id, assigned_by, assigned_at)
               VALUES (?, ?, ?, NOW())
               ON DUPLICATE KEY UPDATE
                 employee_id = VALUES(employee_id),
                 updated_at = NOW()`,
              [id, employeeId, assignedBy],
              (err) => {
                if (err) {
                  console.error("❌ assignEmployee DB error:", err);
                  return res.status(500).json({
                    message: "Failed to assign employee"
                  });
                }

                res.json({
                  success: true,
                  message: "Employee assigned successfully"
                });
              }
            );
          }
        );
      }
    );
  });
};

/* ======================================================
   GET ASSIGNMENT FOR REQUEST
   GET /api/business/repairs/:id/assignment
====================================================== */
export const getAssignmentForRequest = (req, res) => {
  const { id } = req.params;

  resolveShopIdForUser(req, (err, shopId) => {
    if (err) {
      console.error("❌ resolveShopIdForUser error:", err);
      return res.status(500).json({ message: "Server error" });
    }

    if (!shopId) {
      return res.status(404).json({ message: "Shop not found" });
    }

    db.query(
      `
      SELECT 
        ra.employee_id,
        se.first_name,
        se.last_name,
        se.role
      FROM request_assignments ra
      JOIN shop_employees se ON se.id = ra.employee_id
      JOIN service_requests sr ON sr.id = ra.request_id
      WHERE ra.request_id = ?
        AND sr.shop_id = ?
      LIMIT 1
      `,
      [id, shopId],
      (err, rows) => {
        if (err) {
          console.error("❌ getAssignment DB error:", err);
          return res.status(500).json({ message: "Server error" });
        }

        if (rows.length === 0) {
          return res.json({ assignment: null });
        }

        res.json({ assignment: rows[0] });
      }
    );
  });
};

/* ======================================================
   EMPLOYEE EDIT / DEACTIVATE / REACTIVATE
   All scoped to req.shopId (businessShopRequired).
====================================================== */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (value) => String(value ?? "").trim();

function validateEmployee(body) {
  const firstName = clean(body.firstName);
  const lastName = clean(body.lastName);
  const role = clean(body.role);
  const phone = clean(body.phone);
  const email = clean(body.email);

  if (!firstName || !lastName || !role) return { error: "First name, last name and role are required." };
  if (firstName.length > 100 || lastName.length > 100 || role.length > 100) return { error: "Names and role must be 100 characters or fewer." };
  // Optional, but when given it must be a real Philippine mobile number.
  const cleanPhone = phone ? normalizePhone(phone) : null;
  if (phone && !cleanPhone) return { error: `${PHONE_MESSAGE} Or leave the phone empty.` };
  if (email && (email.length > 150 || !EMAIL_RE.test(email))) return { error: "Enter a valid email address or leave it empty." };

  return { values: { firstName, lastName, role, phone: cleanPhone, email: email || null } };
}

/* GET /api/business/employees/all — active and inactive, for the team screen */
export const getAllEmployees = async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `SELECT se.id, se.first_name, se.last_name, se.role, se.phone, se.email, se.is_active,
              DATE_FORMAT(se.created_at, '%Y-%m-%dT%H:%i:%s') AS created_at,
              (SELECT COUNT(*)
               FROM request_assignments ra
               JOIN service_requests sr ON sr.id = ra.request_id
               WHERE ra.employee_id = se.id AND sr.status <> 'COMPLETED') AS open_assignment_count
       FROM shop_employees se
       WHERE se.shop_id = ?
       ORDER BY se.is_active DESC, se.first_name ASC`,
      [req.shopId]
    );
    res.json({ employees: rows });
  } catch (err) {
    console.error("getAllEmployees:", { code: err.code });
    res.status(500).json({ message: "Failed to fetch employees" });
  }
};

/* PUT /api/business/employees/:id */
export const updateEmployee = async (req, res) => {
  const { values, error } = validateEmployee(req.body ?? {});
  if (error) return res.status(400).json({ message: error });

  try {
    const [result] = await db.promise().query(
      `UPDATE shop_employees
       SET first_name = ?, last_name = ?, role = ?, phone = ?, email = ?, updated_at = NOW()
       WHERE id = ? AND shop_id = ?`,
      [values.firstName, values.lastName, values.role, values.phone, values.email, req.params.id, req.shopId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: "Employee not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("updateEmployee:", { code: err.code });
    res.status(500).json({ message: "Couldn't update this employee." });
  }
};

/* POST /api/business/employees/:id/deactivate
   Refused while the employee is assigned to an unfinished repair, so no
   in-flight repair is left with a technician who can't be reassigned to it. */
export const deactivateEmployee = async (req, res) => {
  try {
    const [[employee]] = await db.promise().query(
      `SELECT se.id,
              (SELECT COUNT(*)
               FROM request_assignments ra
               JOIN service_requests sr ON sr.id = ra.request_id
               WHERE ra.employee_id = se.id AND sr.status <> 'COMPLETED') AS open_assignment_count
       FROM shop_employees se
       WHERE se.id = ? AND se.shop_id = ?`,
      [req.params.id, req.shopId]
    );

    if (!employee) return res.status(404).json({ message: "Employee not found" });
    if (Number(employee.open_assignment_count) > 0) {
      return res.status(409).json({
        message: "This employee is assigned to a repair that isn't completed. Reassign it before deactivating them.",
      });
    }

    await db.promise().query(
      "UPDATE shop_employees SET is_active = 0, updated_at = NOW() WHERE id = ? AND shop_id = ?",
      [req.params.id, req.shopId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("deactivateEmployee:", { code: err.code });
    res.status(500).json({ message: "Couldn't deactivate this employee." });
  }
};

/* POST /api/business/employees/:id/reactivate */
export const reactivateEmployee = async (req, res) => {
  try {
    const [result] = await db.promise().query(
      "UPDATE shop_employees SET is_active = 1, updated_at = NOW() WHERE id = ? AND shop_id = ?",
      [req.params.id, req.shopId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: "Employee not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("reactivateEmployee:", { code: err.code });
    res.status(500).json({ message: "Couldn't reactivate this employee." });
  }
};
