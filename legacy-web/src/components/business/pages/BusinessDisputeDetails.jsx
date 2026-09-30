import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL;

const statusBadge = (status) => {
  switch (status) {
    case "OPEN":
      return "bg-red-100 text-red-800";
    case "SHOP_PROPOSED":
      return "bg-yellow-100 text-yellow-800";
    case "RESOLVED":
      return "bg-green-100 text-green-800";
    case "REJECTED":
      return "bg-gray-200 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const BusinessDisputeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const token = localStorage.getItem("token");

  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [resolution, setResolution] = useState("");
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* -------------------------------------------------------
     FETCH DISPUTE (THIS IS THE WIRING PART)
  ------------------------------------------------------- */
  useEffect(() => {
    const fetchDispute = async () => {
      try {
        const res = await axios.get(
          `${API_BASE}/api/disputes/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setDispute(res.data.dispute);
      } catch (err) {
        console.error(err);
        setError("Failed to load dispute");
      } finally {
        setLoading(false);
      }
    };

    fetchDispute();
  }, [id]);

  /* -------------------------------------------------------
     SUBMIT PROPOSAL
  ------------------------------------------------------- */
  const submitProposal = async () => {
    if (!resolution) return;

    try {
      setSubmitting(true);

      await axios.post(
        `${API_BASE}/api/disputes/${id}/propose`,
        { resolution, response },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // refresh dispute
      const res = await axios.get(
        `${API_BASE}/api/disputes/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setDispute(res.data.dispute);
      setResolution("");
      setResponse("");
    } catch (err) {
      console.error(err);
      alert("Failed to submit proposal");
    } finally {
      setSubmitting(false);
    }
  };

  /* -------------------------------------------------------
     RENDER STATES
  ------------------------------------------------------- */
  if (loading) {
    return <div className="p-6 text-gray-500">Loading dispute…</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!dispute) {
    return <div className="p-6">Dispute not found</div>;
  }

  return (
    <div className="w-full px-6 lg:px-10 space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          Dispute #{dispute.id}
        </h1>

        <button
          onClick={() => navigate("/business/disputes")}
          className="text-sm bg-white text-blue-600 hover:underline"
        >
          Back to disputes
        </button>
      </div>

      {/* SUMMARY */}
      <div className="bg-white rounded-xl shadow p-6 grid grid-cols-3 gap-6 text-sm">
        <div>
          <p className="text-gray-500">Client</p>
          <p className="font-medium">
            {dispute.first_name} {dispute.last_name}
          </p>
        </div>

        <div>
          <p className="text-gray-500">Request</p>
          <p className="font-medium">#{dispute.request_id}</p>
        </div>

        <div>
          <p className="text-gray-500">Status</p>
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusBadge(dispute.status)}`}
          >
            {dispute.status.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* CLIENT MESSAGE */}
      <section className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <h2 className="font-semibold text-yellow-800 mb-2">
          Client Complaint
        </h2>

        {dispute.client_message ? (
          <>
            <p className="text-sm text-gray-800 leading-relaxed">
              {dispute.client_message.content}
            </p>

            <p className="text-xs text-gray-500 mt-2">
              Submitted on{" "}
              {new Date(dispute.client_message.created_at).toLocaleDateString()}
            </p>
          </>
        ) : (
          <p className="text-sm italic text-gray-500">
            No message provided by the client.
          </p>
        )}
      </section>

      {/* PROPOSE RESOLUTION */}
      {dispute.status === "OPEN" && (
        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="font-semibold">
            Propose a Resolution
          </h2>

          <select
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            className="w-full border rounded-lg p-2 text-sm"
          >
            <option value="">Select resolution</option>
            <option value="REFUND">Refund</option>
            <option value="RESERVICE">Re-service</option>
          </select>

          <textarea
            rows={4}
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            className="w-full border rounded-lg p-3 text-sm"
            placeholder="Explain your response to the client (optional)"
          />

          <button
            onClick={submitProposal}
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50"
          >
            Submit Proposal
          </button>
        </section>
      )}
    </div>
  );
};

export default BusinessDisputeDetails;
