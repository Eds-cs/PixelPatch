// src/components/business/RepairInProgress.jsx
import { useParams } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://72.62.248.151";

const RepairInProgress = () => {
  const { id } = useParams();

  /* ----------------------------------
     STATE (ALL HOOKS FIRST)
  ---------------------------------- */
  const [repair, setRepair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  /* ----------------------------------
     FETCH REPAIR (IN_PROGRESS or COMPLETED)
  ---------------------------------- */
  useEffect(() => {
    const fetchRepair = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await axios.get(
          `${API_BASE}/api/business/repairs/${id}/in-progress`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setRepair(res.data.repair);
      } catch (err) {
        console.error("❌ Failed to load repair:", err);
        alert("Repair not found");
      } finally {
        setLoading(false);
      }
    };

    fetchRepair();
  }, [id]);

  /* ----------------------------------
     DERIVED VALUES (SAFE)
  ---------------------------------- */
  const isCompleted = repair?.status === "COMPLETED";

  const startedAt = useMemo(() => {
    if (!repair?.started_at) return null;
    return new Date(repair.started_at);
  }, [repair]);

  const completedAt = useMemo(() => {
    if (!repair?.completed_at) return null;
    return new Date(repair.completed_at);
  }, [repair]);

  const deadline = useMemo(() => {
    if (!repair?.quotation?.estimated_completion_time) return null;
    return new Date(repair.quotation.estimated_completion_time);
  }, [repair]);

  const daysDiff = useMemo(() => {
    if (!completedAt || !deadline) return null;
    const ms = completedAt - deadline;
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  }, [completedAt, deadline]);

  /* ----------------------------------
     ACTION: MARK AS COMPLETED
  ---------------------------------- */
  const handleMarkAsCompleted = async () => {
    if (!repair || isCompleted) return;

    try {
      setCompleting(true);
      const token = localStorage.getItem("token");

      await axios.post(
        `${API_BASE}/api/business/repairs/${id}/complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state only
      setRepair(prev => ({
        ...prev,
        status: "COMPLETED",
        completed_at: new Date().toISOString()
      }));

      alert("Repair marked as completed");
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to complete repair");
    } finally {
      setCompleting(false);
    }
  };

  /* ----------------------------------
     RENDER GUARDS (AFTER EVERYTHING)
  ---------------------------------- */
  if (loading) return null;
  if (!repair) return null;

  /* ----------------------------------
     UI
  ---------------------------------- */
  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8 space-y-8">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Request #{id}</h1>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              isCompleted
                ? "bg-blue-100 text-blue-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {isCompleted ? "Completed" : "In Progress"}
          </span>
        </div>

        {/* TIMELINE */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm space-y-1">
          {startedAt && <p>🛠 Started: {startedAt.toLocaleDateString()}</p>}
          {deadline && <p>📅 Deadline: {deadline.toLocaleDateString()}</p>}
          {completedAt && <p>✅ Completed: {completedAt.toLocaleDateString()}</p>}

          {daysDiff !== null && (
            <p className={daysDiff <= 0 ? "text-green-600" : "text-red-600"}>
              {daysDiff <= 0
                ? `Finished ${Math.abs(daysDiff)} day(s) early`
                : `Finished ${daysDiff} day(s) late`}
            </p>
          )}
        </div>

        <hr />

        {/* REQUEST INFO */}
        <section>
          <h2 className="text-lg font-semibold mb-2">Request Information</h2>
          <p><strong>Device:</strong> {repair.device_name}</p>
          <p><strong>Service Type:</strong> {repair.delivery_method}</p>
          <p><strong>Description:</strong> {repair.issue_description}</p>
        </section>

        <hr />

        {/* ASSESSMENT */}
        <section>
          <h2 className="text-lg font-semibold mb-2">Assessment</h2>
          <p><strong>Condition:</strong> {repair.assessment?.device_condition || "—"}</p>
          <p><strong>Issues:</strong> {repair.assessment?.observed_issues || "—"}</p>
          <p><strong>Recommendation:</strong> {repair.assessment?.recommendation || "—"}</p>
        </section>

        <hr />

        {/* PAYMENT */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Payment Breakdown</h2>

          {repair.services?.length > 0 && (
            <div className="space-y-1 mb-4">
              {repair.services.map((s, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{s.name}</span>
                  <span>₱{Number(s.price).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {repair.parts?.length > 0 && (
            <div className="space-y-1 mb-4">
              {repair.parts.map((p, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{p.name}</span>
                  <span>₱{Number(p.cost).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-3 flex justify-between font-semibold">
            <span>Total Paid</span>
            <span className="text-blue-600">
              ₱{Number(repair.payment?.amount || 0).toLocaleString()}
            </span>
          </div>

          {repair.payment?.payment_link && (
            <a
              href={repair.payment.payment_link}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-3 text-sm text-blue-600 underline"
            >
              View Invoice
            </a>
          )}
        </section>

        {/* ACTION */}
        {!isCompleted && (
          <div className="flex justify-end pt-4">
            <button
              onClick={handleMarkAsCompleted}
              disabled={completing}
              className={`rounded-lg px-5 py-2 text-sm text-white ${
                completing
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {completing ? "Completing..." : "Mark as Completed"}
            </button>
          </div>
        )}
      </div>
    </main>

  );
};

export default RepairInProgress;
