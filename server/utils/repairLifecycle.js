// server/utils/repairLifecycle.js
// Starting and completing a repair (AGENTS.md section 15, steps 8 and 9),
// shared by the owner (controllers/repairController.js) and the assigned
// employee (controllers/staffController.js), so the rules live in one place.
//
// Each returns { status, body } for the caller to send.
import db from "../config/db.js";

const query = (sql, params = []) => db.promise().query(sql, params).then(([rows]) => rows);

/**
 * Step 8: status -> IN_PROGRESS. Requires an accepted, paid request with an
 * employee assigned. `employeeId` (staff only): that employee must be the
 * one assigned.
 */
export async function startRepairFor({ requestId, shopId, employeeId = null }) {
  if (!requestId) return { status: 400, body: { message: "Request ID is required" } };

  const [request] = await query(
    "SELECT id, status, decision, payment_status FROM service_requests WHERE id = ? AND shop_id = ? LIMIT 1",
    [requestId, shopId]
  );
  if (!request) return { status: 404, body: { message: "Request not found" } };
  if (request.status === "COMPLETED") return { status: 400, body: { message: "Repair already completed" } };
  if (request.decision !== "ACCEPTED") return { status: 400, body: { message: "Request not accepted" } };
  if (request.payment_status !== "PAID") return { status: 400, body: { message: "Payment required" } };

  const [assignment] = await query("SELECT employee_id FROM request_assignments WHERE request_id = ? LIMIT 1", [requestId]);
  if (!assignment) return { status: 400, body: { message: "Employee must be assigned before starting repair" } };
  if (employeeId !== null && Number(assignment.employee_id) !== Number(employeeId)) {
    return { status: 403, body: { message: "This repair isn't assigned to you." } };
  }

  await query(
    "UPDATE service_requests SET status = 'IN_PROGRESS', updated_at = NOW() WHERE id = ? AND shop_id = ?",
    [requestId, shopId]
  );
  return { status: 200, body: { message: "Repair started successfully", status: "IN_PROGRESS" } };
}

/**
 * Step 9: status -> COMPLETED. Requires IN_PROGRESS and PAID. `employeeId`
 * (staff only): the repair must be assigned to that employee.
 */
export async function completeRepairFor({ requestId, shopId, employeeId = null }) {
  const [request] = await query(
    "SELECT status, payment_status FROM service_requests WHERE id = ? AND shop_id = ? LIMIT 1",
    [requestId, shopId]
  );
  if (!request) return { status: 404, body: { message: "Request not found" } };

  if (employeeId !== null) {
    const [assignment] = await query("SELECT employee_id FROM request_assignments WHERE request_id = ? LIMIT 1", [requestId]);
    if (!assignment || Number(assignment.employee_id) !== Number(employeeId)) {
      return { status: 403, body: { message: "This repair isn't assigned to you." } };
    }
  }
  if (request.status !== "IN_PROGRESS") return { status: 400, body: { message: "Repair must be in progress to complete" } };
  if (request.payment_status !== "PAID") return { status: 400, body: { message: "Payment not completed" } };

  await query(
    "UPDATE service_requests SET status = 'COMPLETED', updated_at = NOW(), completed_at = NOW() WHERE id = ? AND shop_id = ?",
    [requestId, shopId]
  );
  return { status: 200, body: { message: "Repair marked as completed", status: "COMPLETED" } };
}
