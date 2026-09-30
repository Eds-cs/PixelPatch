// business/pages/BusinessDashboard.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from "chart.js";

import BusinessLayout from "../components/BusinessLayout";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

export default function BusinessDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("month");

  /* ---------------- AUTH HEADER ---------------- */
  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  /* ---------------- FETCH DASHBOARD ---------------- */
  useEffect(() => {
    setLoading(true);

    axios
      .get(`${import.meta.env.VITE_API_URL}/api/business/dashboard?range=${range}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => {
        setDashboard(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard load error:", err);
        setLoading(false);
      });
  }, [range, token]);

  if (loading) {
    return (
        <div className="p-6">Loading dashboard…</div>

    );
  }

  if (!dashboard) {
    return (
        <div className="p-6 text-red-600">
          Failed to load dashboard.
        </div>

    );
  }

  /* ---------------- DONUT ---------------- */
  const donutData = {
    labels: ["Pending", "Accepted", "In Progress", "Completed"],
    datasets: [
      {
        data: [
          dashboard.statusBreakdown.pending,
          dashboard.statusBreakdown.accepted,
          dashboard.statusBreakdown.in_progress,
          dashboard.statusBreakdown.completed,
        ],
        backgroundColor: ["#93c5fd", "#a5b4fc", "#9333ea", "#2563eb"],
        borderWidth: 0,
      },
    ],
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "75%",
    plugins: { legend: { display: false } },
  };

  /* ---------------- REVENUE ---------------- */
  const revenueByPeriod = dashboard.revenueByPeriod || [];

  const revenueData = {
    labels: revenueByPeriod.map((r) => {
      if (dashboard.range === "week") return `Day ${r.label}`;
      if (dashboard.range === "month") return `Day ${r.label}`;
      if (dashboard.range === "year") return `Month ${r.label}`;
      return r.label;
    }),
    datasets: [
      {
        data: revenueByPeriod.map((r) => r.revenue),
        borderColor: "#3B82F6",
        backgroundColor: "rgba(59,130,246,0.1)",
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
      },
    ],
  };


  return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Overview</h1>

        {/* TOP STATS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow border">
            <h2 className="text-sm text-gray-500">Clients this month</h2>
            <span className="text-3xl font-bold">
              {dashboard.clientsThisMonth}
            </span>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <h2 className="text-sm text-gray-500">Requests this month</h2>
            <span className="text-3xl font-bold">
              {dashboard.requestsThisMonth}
            </span>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <h2 className="text-sm text-gray-500">Total Transactions</h2>
            <span className="text-3xl font-bold">
              {dashboard.totalTransactions}
            </span>
          </div>
        </div>

        {/* DONUT + REVENUE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* DONUT */}
          <div className="bg-white p-6 rounded-lg shadow border">
            <h2 className="text-lg font-semibold">Request Status</h2>

            <div className="h-64 relative my-4">
              <Doughnut data={donutData} options={donutOptions} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold">
                  {dashboard.averageRange}
                </span>
                <span className="text-sm text-gray-500">
                  Average range
                </span>
              </div>
            </div>
          </div>

          {/* REVENUE */}
          <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow border">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">Total Revenue</h2>

              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="border rounded-md px-3 py-1 text-sm"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
              </select>
            </div>

            <div className="h-80 mt-4">
              <Line
                data={revenueData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                }}
              />
            </div>
          </div>
        </div>
      </div>

  );
}
