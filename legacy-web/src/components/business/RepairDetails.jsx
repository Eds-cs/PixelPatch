// src/components/business/RepairDetails.jsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { ROUTES } from "../../constants/routes";
import RejectionModal from "./RejectionModal";

const API_BASE = import.meta.env.VITE_API_URL || "http://72.62.248.151";

export default function RepairDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [repair, setRepair] = useState(null);
  const [error, setError] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);

  /* ---------------------------------------------------
     LOAD REPAIR DETAILS
  --------------------------------------------------- */
  useEffect(() => {
    const loadDetails = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await axios.get(
          `${API_BASE}/api/business/repairs/details/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const r = res.data.repair;

        setRepair({
          ...r,
          services: Array.isArray(r.services) ? r.services : []
        });
      } catch (err) {
        console.error("❌ Failed loading repair details:", err);
        setError("Failed to load repair details.");
      }
    };

    loadDetails();
  }, [id]);

  /* ---------------------------------------------------
     AUTO-REDIRECT AFTER CONFIRM
  --------------------------------------------------- */
  useEffect(() => {
    if (!repair) return;

    if (repair.decisionStatus?.toUpperCase() === "ACCEPTED") {
      navigate(
        ROUTES.BUSINESS.REPAIR_ASSESSMENT.replace(":id", id),
        { replace: true }
      );
    }
  }, [repair, id, navigate]);

  /* ---------------------------------------------------
     CONFIRM HANDLER
  --------------------------------------------------- */
  const handleConfirm = async () => {
    try {
      const token = localStorage.getItem("token");

      console.log(`📡 Confirming repair ${id}...`);

      const res = await axios.post(
        `${API_BASE}/api/business/repairs/confirm/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log("📥 Confirm response:", res.data);

      setRepair(prev => ({
        ...prev,
        decisionStatus: "ACCEPTED"
      }));

    } catch (error) {
      console.error("❌ Confirmation failed:", error);
      alert(error?.response?.data?.message || "Failed to confirm request.");
    }
  };


  if (error) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-red-600">{error}</p>
      </main>
    );
  }

  if (!repair) return null;

  const decision = repair.decisionStatus?.toLowerCase();

  const statusMap = {
    pending: {
      box: "bg-yellow-100 border-yellow-500 text-yellow-800",
      badge: "bg-yellow-200 text-yellow-900",
      label: "Pending"
    },
    accepted: {
      box: "bg-blue-100 border-blue-500 text-blue-800",
      badge: "bg-blue-200 text-blue-900",
      label: "Accepted"
    },
    rejected: {
      box: "bg-red-100 border-red-500 text-red-800",
      badge: "bg-red-200 text-red-900",
      label: "Rejected"
    }
  };

  const status = statusMap[decision] || statusMap.pending;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="mt-6">
        <Link
          to={ROUTES.BUSINESS.REPAIRS}
          className="inline-block text-sm text-blue-600 hover:underline"
        >
          Back to repairs
        </Link>
      </div>
      <br />
      {/* STATUS BANNER */}
      <div className={`border-l-4 p-4 rounded-lg flex justify-between items-center mb-6 ${status.box}`}>
        <p className="font-medium">
          {decision === "pending"
            ? "This repair request is awaiting your review."
            : `This request has been ${decision}.`}
        </p>
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${status.badge}`}>
          {status.label}
        </span>
      </div>

      {/* MAIN CARD */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="relative bg-white pb-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Request Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <span className="text-gray-500">Client</span>
              <p className="font-medium text-gray-800">{repair.client}</p>
            </div>

            <div>
              <span className="text-gray-500">Device</span>
              <p className="font-medium text-gray-800">{repair.deviceType}</p>
            </div>

            <div>
              <span className="text-gray-500">Delivery Method</span>
              <p className="font-medium text-gray-800">
                {repair.deliveryMethod || "Not specified"}
              </p>
            </div>

            {repair.deliveryMethod !== "ONSITE" && (
              <p>
                <strong>
                  {repair.deliveryMethod === "PICKUP" ? "Pickup Address:" : "Drop-off Address:"}
                </strong>{" "}
                {repair.pickupAddress || "N/A"}
              </p>
            )}

            <div>
              <span className="text-gray-500">Preferred Date</span>
              <p className="font-medium text-gray-800">
                {repair.preferredDate
                  ? new Date(repair.preferredDate).toLocaleString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true
                    })
                  : "Not specified"}
              </p>
            </div>

            <div className="md:col-span-2">
              <span className="text-gray-500">Issue Description</span>
              <p className="font-medium text-gray-800">
                {repair.issueDescription}
              </p>
            </div>
          </div>
        </div>

        {/* SERVICES */}
        <div className="pt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Selected Services
          </h2>

          {repair.services.length === 0 ? (
            <p className="text-gray-500 text-sm">No services selected</p>
          ) : (
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-800">
              {repair.services.map((name, i) => (
                <li key={i}>{name}</li>
              ))}
            </ul>
          )}
        </div>

        {/* REJECTION REASON (only if rejected) */}
        {decision === "rejected" && repair.rejectionReason && (
          <div className="mt-6 p-4 rounded-lg border border-red-200 bg-red-50">
            <h3 className="text-sm font-semibold text-red-800 mb-2">
              Rejection Reason
            </h3>
            <p className="text-sm text-red-700 whitespace-pre-line">
              {repair.rejectionReason}
            </p>
          </div>
        )}

      </div>

      {/* ACTION BAR */}
      {decision === "pending" && (
        <div className="mt-8 flex justify-end gap-4">
          <button
            onClick={() => setShowRejectModal(true)}
            className="rounded-lg py-2 px-5 text-sm font-medium text-white shadow-sm bg-red-600 hover:bg-red-700"
          >
            Reject
          </button>
          <button
            onClick={handleConfirm}
            className="rounded-lg py-2 px-5 text-sm font-medium text-white shadow-sm bg-blue-600 hover:bg-blue-700"
          >
            Confirm
          </button>
        </div>
      )}


      <RejectionModal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        requestId={id}
        onSubmit={() => {
          setRepair(prev => ({
            ...prev,
            decisionStatus: "REJECTED"
          }));
        }}
      />

    </main>
  );
}
