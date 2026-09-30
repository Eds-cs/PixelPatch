// src/components/Repairs/Repairs.jsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL;

/* ======================================================
   CLIENT REPAIR LIST — BACKEND WIRED
====================================================== */

const TABS = [
  "All",
  "Waiting for Shop",
  "Needs Your Action",
  "In Progress",
  "Completed",
];

const tabColors = {
  All: "bg-gray-500",
  "Waiting for Shop": "bg-yellow-500",
  "Needs Your Action": "bg-blue-500",
  "In Progress": "bg-orange-500",
  Completed: "bg-green-500",
};

/* -------------------------------
   CLIENT FLOW HELPERS
-------------------------------- */
const isWaitingForShop = (r) => r.decision === "PENDING";

const needsYourAction = (r) =>
  (r.decision === "ACCEPTED" && r.client_approved === null) ||
  (r.client_approved === 1 && r.payment_status === "PENDING");

const isInProgress = (r) => r.status === "IN_PROGRESS";
const isCompleted = (r) => r.status === "COMPLETED";

const getUIStatus = (r) => {
  if (isWaitingForShop(r)) return "Waiting for Shop";
  if (needsYourAction(r)) return "Needs Your Action";
  if (isInProgress(r)) return "In Progress";
  if (isCompleted(r)) return "Completed";
  return "Unknown";
};

const statusStyles = {
  "Waiting for Shop": "bg-yellow-100 text-yellow-800",
  "Needs Your Action": "bg-blue-100 text-blue-800",
  "In Progress": "bg-orange-100 text-orange-800",
  Completed: "bg-green-100 text-green-800",
};

const getClientMessage = (r) => {
  if (r.decision === "PENDING")
    return "Waiting for the shop to review your request.";

  if (r.decision === "ACCEPTED" && r.client_approved === null)
    return "Quotation is ready. Please review and approve.";

  if (r.client_approved === 1 && r.payment_status === "PENDING")
    return "Payment is required to proceed.";

  if (r.status === "IN_PROGRESS")
    return "Your device is currently being repaired.";

  if (r.status === "COMPLETED")
    return "Repair completed.";

  return "";
};

const formatDate = (date) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));

/* ======================================================
   CARD
====================================================== */
const RepairCard = ({ repair, onClick }) => {
  const uiStatus = getUIStatus(repair);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition"
    >
      <div className="flex justify-between items-center p-4">
        <span
          className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusStyles[uiStatus]}`}
        >
          {uiStatus}
        </span>
        <span className="text-xs text-gray-500">
          {formatDate(repair.created_at)}
        </span>
      </div>

      <div className="p-4 pt-0">
        <img
          className="w-full h-32 object-contain mb-3"
          src="https://placehold.co/300x200/e0f2fe/3b82f6?text=Device"
          alt={repair.device_name}
        />

        <h2 className="font-semibold text-lg">
          {repair.device_name}
        </h2>

        <p className="text-sm text-gray-500">
          {repair.device_brand} • {repair.device_model}
        </p>

        <p className="text-sm text-gray-600 mt-2">
          {getClientMessage(repair)}
        </p>
      </div>
    </div>
  );
};

/* ======================================================
   PAGE
====================================================== */
const Repairs = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [repairs, setRepairs] = useState([]);
  const [activeTab, setActiveTab] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const tabRefs = useRef([]);
  const [underlineStyle, setUnderlineStyle] = useState({
    left: 0,
    width: 0,
    bg: tabColors.All,
  });

  /* -------------------------------
     FETCH REPAIRS
  -------------------------------- */
  useEffect(() => {
    const fetchRepairs = async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `${API_BASE}/api/client/repairs`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setRepairs(res.data.repairs);
      } catch (err) {
        setError("Failed to load repairs.");
      } finally {
        setLoading(false);
      }
    };

    fetchRepairs();
  }, []);

  /* -------------------------------
     FILTER
  -------------------------------- */
  const filteredRepairs = repairs.filter((r) => {
    if (activeTab === "All") return true;
    if (activeTab === "Waiting for Shop") return isWaitingForShop(r);
    if (activeTab === "Needs Your Action") return needsYourAction(r);
    if (activeTab === "In Progress") return isInProgress(r);
    if (activeTab === "Completed") return isCompleted(r);
    return false;
  });

  /* -------------------------------
     TAB UNDERLINE
  -------------------------------- */
  useEffect(() => {
    const index = TABS.indexOf(activeTab);
    const el = tabRefs.current[index];
    if (el) {
      setUnderlineStyle({
        left: el.offsetLeft,
        width: el.offsetWidth,
        bg: tabColors[activeTab],
      });
    }
  }, [activeTab]);

  if (loading) {
    return <div className="p-10 text-center text-gray-500">Loading repairs…</div>;
  }

  if (error) {
    return <div className="p-10 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Repairs</h1>

        {/* Tabs */}
        <div className="border-b border-gray-200 relative">
          <nav className="flex space-x-6">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                ref={(el) => (tabRefs.current[i] = el)}
                onClick={() => setActiveTab(tab)}
                className={`py-3 bg-white text-sm font-medium ${
                  activeTab === tab
                    ? "text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>

          <span
            className={`absolute bottom-0 h-0.5 transition-all ${underlineStyle.bg}`}
            style={{
              left: underlineStyle.left,
              width: underlineStyle.width,
            }}
          />
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
          {filteredRepairs.map((repair) => (
            <RepairCard
              key={repair.id}
              repair={repair}
              onClick={() => navigate(`/repairs/${repair.id}`)}
            />
          ))}
        </div>

        {filteredRepairs.length === 0 && (
          <div className="text-center py-16 text-gray-500 text-sm">
            No repairs to show.
          </div>
        )}
      </main>
    </div>
  );
};

export default Repairs;
