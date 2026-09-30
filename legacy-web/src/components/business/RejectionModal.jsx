// src/components/business/RejectionModal.jsx
import { useState } from "react";
import PropTypes from "prop-types";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://72.62.248.151";


export default function RejectionModal({ isOpen, onClose, requestId, onSubmit }) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) return;

    try {
      setIsLoading(true);

      const token = localStorage.getItem("token");
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      console.log(`📡 Rejecting repair ${requestId}...`);

      const res = await axios.post(
        `${API_BASE}/api/business/repairs/reject/${requestId}`,
        { reason: rejectionReason }
      );

      console.log("📥 Reject response:", res.data);

      // Refresh repair table in parent component
      if (onSubmit) onSubmit();

      // Reset fields
      setRejectionReason("");
      onClose();

    } catch (error) {
      console.error("❌ Rejection failed:", error);
      alert(error?.response?.data?.message || "Failed to reject request.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">

        {/* HEADER */}
        <div className="flex justify-between items-center p-5 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Reason for Rejection
          </h2>
          <button
            onClick={onClose}
            className="bg-white text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor">
              <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit}>
          <div className="p-5">
            <textarea
              rows="6"
              className="block w-full rounded-lg border-gray-200 bg-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-4"
              placeholder="Provide a reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              required
            />
          </div>

          {/* FOOTER */}
          <div className="flex justify-end p-5 pt-0 border-t">
            <button
              type="submit"
              disabled={isLoading}
              className={`rounded-lg border border-transparent bg-red-600 py-2 px-6 text-base font-medium text-white shadow-sm 
                ${isLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-red-700"}
              `}
            >
              {isLoading ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

RejectionModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  requestId: PropTypes.string.isRequired,
  onSubmit: PropTypes.func, // refresh parent table
};
