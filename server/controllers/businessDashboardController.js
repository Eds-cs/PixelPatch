import db from "../config/db.js";

// --------------------------------------------------
// Promise wrapper
// --------------------------------------------------
const query = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });

// --------------------------------------------------
// GET BUSINESS DASHBOARD
// --------------------------------------------------
export const getBusinessDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const range = req.query.range || "month";

    // --------------------------------------------------
    // 1. Resolve shop
    // --------------------------------------------------
    const [shop] = await query(
      "SELECT id FROM shops WHERE user_id = ? LIMIT 1",
      [userId]
    );

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    const shopId = shop.id;

    // --------------------------------------------------
    // 2. Revenue range config
    // --------------------------------------------------
    let revenueCondition = "";
    let groupBy = "";

    switch (range) {
      case "week":
        revenueCondition =
          "YEARWEEK(paid_at, 1) = YEARWEEK(CURDATE(), 1)";
        groupBy = "DAY(paid_at)";
        break;

      case "year":
        revenueCondition =
          "YEAR(paid_at) = YEAR(CURDATE())";
        groupBy = "MONTH(paid_at)";
        break;

      case "month":
      default:
        revenueCondition = `
          MONTH(paid_at) = MONTH(CURDATE())
          AND YEAR(paid_at) = YEAR(CURDATE())
        `;
        groupBy = "DAY(paid_at)";
        break;
    }

    // --------------------------------------------------
    // 3. Execute queries
    // --------------------------------------------------
    const [
      clients,
      requests,
      statusCounts,
      transactions,
      revenueByPeriod,
      avgRange
    ] = await Promise.all([
      // Clients this month
      query(
        `
        SELECT COUNT(DISTINCT client_id) AS count
        FROM service_requests
        WHERE shop_id = ?
          AND MONTH(created_at) = MONTH(CURDATE())
          AND YEAR(created_at) = YEAR(CURDATE())
        `,
        [shopId]
      ),

      // Requests this month
      query(
        `
        SELECT COUNT(*) AS count
        FROM service_requests
        WHERE shop_id = ?
          AND MONTH(created_at) = MONTH(CURDATE())
          AND YEAR(created_at) = YEAR(CURDATE())
        `,
        [shopId]
      ),

      // Status breakdown
      query(
        `
        SELECT
          SUM(decision = 'PENDING') AS pending,
          SUM(decision = 'ACCEPTED') AS accepted,
          SUM(status = 'IN_PROGRESS') AS in_progress,
          SUM(status = 'COMPLETED') AS completed
        FROM service_requests
        WHERE shop_id = ?
        `,
        [shopId]
      ),

      // Total transactions (paid)
      query(
        `
        SELECT COUNT(*) AS count
        FROM payments
        WHERE shop_id = ?
          AND status = 'PAID'
        `,
        [shopId]
      ),

      // Revenue by selected range
      query(
        `
        SELECT
          ${groupBy} AS label,
          COALESCE(SUM(amount), 0) AS revenue
        FROM payments
        WHERE shop_id = ?
          AND status = 'PAID'
          AND ${revenueCondition}
        GROUP BY ${groupBy}
        ORDER BY label
        `,
        [shopId]
      ),

      // Average estimated price
      query(
        `
        SELECT ROUND(AVG(estimated_price), 2) AS avg
        FROM service_requests
        WHERE shop_id = ?
        `,
        [shopId]
      )
    ]);

    // --------------------------------------------------
    // 4. Response (FRONTEND CONTRACT)
    // --------------------------------------------------
    return res.json({
      range,
      clientsThisMonth: clients[0]?.count || 0,
      requestsThisMonth: requests[0]?.count || 0,
      statusBreakdown: {
        pending: statusCounts[0]?.pending || 0,
        accepted: statusCounts[0]?.accepted || 0,
        in_progress: statusCounts[0]?.in_progress || 0,
        completed: statusCounts[0]?.completed || 0
      },
      totalTransactions: transactions[0]?.count || 0,
      revenueByPeriod,
      averageRange: avgRange[0]?.avg || 0
    });

  } catch (err) {
    console.error("❌ Dashboard error:", err);
    return res.status(500).json({ message: "Dashboard load failed" });
  }
};
