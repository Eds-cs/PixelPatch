// src/components/business/RepairCompleted.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://72.62.248.151";

const RepairCompleted = () => {
  const { id } = useParams();
  const [repair, setRepair] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompletedRepair = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await axios.get(
          `${API_BASE}/api/business/repairs/${id}/completed`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setRepair(res.data.repair);
      } catch (err) {
        console.error("❌ Failed to load completed repair:", err);
        alert("Completed repair not found");
      } finally {
        setLoading(false);
      }
    };

    fetchCompletedRepair();
  }, [id]);

  if (loading) return null;
  if (!repair) return null;

  /* --------------------------------------------------
     Date helpers
  -------------------------------------------------- */
  const completedAt = new Date(repair.completed_at);
  const deadline = repair.quotation?.estimated_completion_time
    ? new Date(repair.quotation.estimated_completion_time)
    : null;

  const daysDifference =
    deadline &&
    Math.ceil((completedAt - deadline) / (1000 * 60 * 60 * 24));

  console.log("COMPLETED REPAIR:", repair);

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8 space-y-8">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Request #{id}</h1>
          <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            Completed
          </span>
        </div>

        {/* TIMELINE / SUMMARY */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm space-y-1">
          <p>
            ✅ Completed on{" "}
            <strong>{completedAt.toLocaleString()}</strong>
          </p>

          {deadline && (
            <p className={daysDifference <= 0 ? "text-green-600" : "text-red-600"}>
              {daysDifference <= 0
                ? `Finished ${Math.abs(daysDifference)} day(s) early`
                : `Finished ${daysDifference} day(s) late`}
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

        {/* ASSESSMENT (READ-ONLY) */}
        <section>
          <h2 className="text-lg font-semibold mb-2">Assessment</h2>
          <p>
            <strong>Condition:</strong>{" "}
            {repair.assessment?.device_condition || "—"}
          </p>
          <p>
            <strong>Issues:</strong>{" "}
            {repair.assessment?.observed_issues || "—"}
          </p>
          <p>
            <strong>Recommendation:</strong>{" "}
            {repair.assessment?.recommendation || "—"}
          </p>
        </section>

        <hr />

        {/* INVOICE */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Invoice Summary</h2>

          {/* SERVICES */}
          {repair.services?.length > 0 && (
            <div className="mb-4 space-y-1">
              <p className="font-medium">Services</p>
              {repair.services.map((s, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{s.name}</span>
                  <span>₱{Number(s.price || s.base_price).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {/* PARTS */}
          {repair.parts?.length > 0 && (
            <div className="mb-4 space-y-1">
              <p className="font-medium">Parts</p>
              {repair.parts.map((p, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>{p.name}</span>
                  <span>₱{Number(p.cost).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {/* TOTAL */}
          <div className="border-t pt-3 flex justify-between font-semibold">
            <span>Total Paid</span>
            <span className="text-blue-600">
              ₱{Number(repair.payment?.amount || 0).toLocaleString()}
            </span>
          </div>

          {/* INVOICE LINK */}
          {repair.payment?.payment_link && (
            <a
              href={repair.payment.payment_link}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-3 text-sm text-blue-600 underline"
            >
              View Xendit Invoice
            </a>
          )}
        </section>

        {/* FOOTER */}
        <div className="flex justify-end pt-4">
          <Link
            to="/business/repairs"
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Back to Repairs
          </Link>
        </div>

      </div>
    </main>

  );
};

export default RepairCompleted;
