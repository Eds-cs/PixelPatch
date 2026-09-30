// controllers/business/employeeController.js
import db from "../../config/db.js";
import { resolveShopIdForUser } from "../../utils/resolveShopIdForUser.js";


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

    db.query(
      `INSERT INTO shop_employees
       (shop_id, first_name, last_name, role, phone, email, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`,
      [shopId, req.body.firstName, req.body.lastName, req.body.role, req.body.phone || null, req.body.email || null],
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
              role
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
