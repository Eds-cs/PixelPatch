import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import ReviewForm from "../Reviews/ReviewForm";

const API_BASE = import.meta.env.VITE_API_URL;




// ===== CLIENT FLOW HELPERS (AUTHORITATIVE) =====

const isWaitingForShop = (r) =>
  r?.decision === "PENDING";

const canApproveQuotation = (r) =>
  r?.decision === "ACCEPTED" &&
  r.client_approved === null;

const canCancelRequest = (r) =>
  r?.client_approved === null &&
  r?.payment_status === "PENDING";

const isAwaitingPaymentLink = (r) =>
  r?.client_approved === 1 &&
  !r?.payment?.payment_link;

const hasPaymentLink = (r) =>
  !!r?.payment?.payment_link;

const isInProgress = (r) =>
  r?.status === "IN_PROGRESS";

const isCompleted = (r) =>
  r?.status === "COMPLETED";


const ClientRepairDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [repair, setRepair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  // review state
  const [hasReviewed, setHasReviewed] = useState(false);
  const [review, setReview] = useState(null);

  const token = localStorage.getItem("token");

  // dispute state
  const [dispute, setDispute] = useState(null);
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [disputeText, setDisputeText] = useState("");
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [disputeEdits, setDisputeEdits] = useState([]);


  /* -------------------------------
    helpers
  -------------------------------- */

  const getPostResolutionMessage = (resolution) => {
    if (resolution === "REFUND") {
      return "Your refund is being processed. You should receive it within a few hours to several business days, depending on your payment provider.";
    }

    if (resolution === "RESERVICE") {
      return "The shop will re-service your device. They may contact you shortly to arrange the next steps.";
    }

    return null;
  };



  const formatDate = (dateStr) => {
    if (!dateStr) return "—";

    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(dateStr));
  };

  const getDateStarted = (repair) => {
    if (repair.status === "IN_PROGRESS" || repair.status === "COMPLETED") {
      return formatDate(repair.updated_at);
    }
    return "—";
  };

  const getDateFinished = (repair) => {
    if (repair.status === "COMPLETED") {
      return formatDate(repair.updated_at);
    }
    return "—";
  };

  const getDeadline = (repair) => {
    return repair.quotation
      ? formatDate(repair.quotation.estimated_completion_time)
      : "—";
  };

// const shouldPollForPaymentLink = (r) =>
//   r &&
//   r.client_approved === true &&
//   r.payment_status === "PENDING" &&
//   !r.payment?.payment_link;

  const isPaymentPending = (r) =>
    r?.payment &&
    r.payment.payment_link &&
    r.payment.status === "PENDING" &&
    !r.payment.paid_at;

  const isPaymentCompleted = (r) =>
    r?.payment &&
    (r.payment.status === "PAID" || r.payment.paid_at);

  const isAwaitingRepairStart = (r) =>
    r &&
    r.payment &&
    (r.payment.status === "PAID" || r.payment.paid_at) &&
    !["IN_PROGRESS", "COMPLETED"].includes(r.status);

  const hasOpenDispute = (r) =>
    r?.dispute &&
    ["OPEN", "SHOP_PROPOSED"].includes(r.dispute.status);

  const canOpenDispute = (r) =>
    r?.status === "COMPLETED" &&
    r?.payment_status === "PAID" &&
    !r?.review &&
    !r?.dispute;


  const canLeaveReview = (r, dispute) =>
    r.status === "COMPLETED" &&
    !r.review &&
    (!dispute || dispute.status === "RESOLVED" || dispute.status === "REJECTED");


  const handleApproveAndPay = async () => {
    if (actionLoading || repair?.client_approved === 1) return;

    try {
      setActionLoading(true);

      await axios.patch(
        `${API_BASE}/api/client/repairs/${id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchRepair(); // refresh state
    } catch (err) {
      console.error(err.response?.data || err);
    } finally {
      setActionLoading(false);
    }
  };



  /* ----------------------------------
     FETCH REPAIR DETAILS
  ---------------------------------- */
  const fetchRepair = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await axios.get(
        `${API_BASE}/api/client/repairs/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // console.log("API RESPONSE:", res.data);
      setRepair(res.data.repair);
      setReview(res.data.review || null);
      setDispute(res.data.dispute || null);
      setDisputeEdits(res.data.dispute_edits || []); 

    } catch (err) {
      console.error(err);
      setError("Failed to load repair details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepair();
  }, [id]);

  useEffect(() => {
    if (!isAwaitingPaymentLink(repair)) return;

    const interval = setInterval(fetchRepair, 5000);
    return () => clearInterval(interval);
  }, [
    repair?.client_approved,
    repair?.payment?.payment_link,
  ]);


  /* ----------------------------------
     ACTIONS
  ---------------------------------- */


  const cancelRequest = async () => {
    if (!confirm("Are you sure you want to cancel this repair request?")) return;

    try {
      setActionLoading(true);

      await axios.patch(
        `${API_BASE}/api/client/repairs/${id}/cancel`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      navigate("/repairs");
    } catch (err) {
      alert("Failed to cancel request.");
    } finally {
      setActionLoading(false);
    }
  };

  /* ----------------------------------
     RENDER STATES
  ---------------------------------- */
  if (loading) {
    return (
      <div className="p-10 text-center text-gray-500">
        Loading repair details…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center text-red-500">
        {error}
      </div>
    );
  }

  if (!repair) {
    return (
      <div className="p-10 text-center text-red-500">
        Repair not found.
      </div>
    );
  }
  console.log("EMPLOYEE:", repair.assigned_employee);

  // console.log("🔍 ACTION CHECK", {
  //   decision: repair.decision,
  //   status: repair.status,
  //   client_approved: repair.client_approved,
  //   payment_status: repair.payment_status,
  // });


  return (
    <div className="bg-gray-50 min-h-screen">
      <main className="max-w-4xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Repair Details
          </h1>
          <button
            onClick={() => navigate("/repairs")}
            className="text-sm bg-gray-50 text-blue-600 hover:text-white hover:bg-blue-500 transition"
          >
            ← Back to Repairs
          </button>
        </div>

        {/* MAIN CARD */}
        <div className="bg-white rounded-xl shadow-md p-8 space-y-10">

          {/* IMPORTANT DATES */}
          <section className="bg-blue-50 border border-blue-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-blue-800 mb-3 uppercase tracking-wide">
              Important Dates
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Repair Started</p>
                <p className="font-medium text-gray-900">
                  {getDateStarted(repair)}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Deadline</p>
                <p className="font-medium text-gray-900">
                  {getDeadline(repair)}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Date Finished</p>
                <p className="font-medium text-gray-900">
                  {getDateFinished(repair)}
                </p>
              </div>
            </div>
          </section>

          {/* REQUEST SUMMARY */}
          <section>
            <h2 className="text-lg font-semibold mb-4 text-gray-900">
              Request Summary
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <p>
                <span className="text-gray-500">Device</span><br />
                <span className="font-medium">{repair.device_name}</span>
              </p>

              <p>
                <span className="text-gray-500">Delivery Method</span><br />
                <span className="font-medium">{repair.delivery_method}</span>
              </p>

              <p>
                <span className="text-gray-500">Issue</span><br />
                <span className="font-medium">{repair.issue_description}</span>
              </p>

              <p>
                <span className="text-gray-500">Preferred Date</span><br />
                <span className="font-medium">
                  {formatDate(repair.preferred_date)}
                </span>
              </p>
            </div>
            
          </section>
          {/* ASSIGNED EMPLOYEE */}
          {repair.assigned_employee && (
            <section className="bg-gray-50 border rounded-lg p-4">
              <h2 className="text-sm font-semibold text-gray-600 mb-2 uppercase">
                Assigned Employee
              </h2>

              <p className="text-sm">
                <span className="font-medium">
                  {repair.assigned_employee.first_name}{" "}
                  {repair.assigned_employee.last_name}
                </span>
              </p>

              <p className="text-xs text-gray-500">
                Role: {repair.assigned_employee.role}
              </p>
            </section>
          )}

          {/* NOT ASSIGNED YET */}
          {!repair.assigned_employee && isAwaitingRepairStart(repair) && (
            <div className="text-sm text-gray-500 italic">
              Technician has not been assigned yet.
            </div>
          )}


          {/* STATUS MESSAGE */}
          {isWaitingForShop(repair) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              Waiting for the shop to review your request.
            </div>
          )}

          {/* ASSESSMENT */}
          {repair.assessment && (
            <section>
              <h2 className="text-lg font-semibold mb-3">
                Assessment
              </h2>

              <div className="space-y-2 text-sm">
                <p><strong>Condition:</strong> {repair.assessment.device_condition}</p>
                <p><strong>Issues:</strong> {repair.assessment.observed_issues}</p>
                <p><strong>Recommendation:</strong> {repair.assessment.recommendation}</p>
                <p>
                  <strong>Repair Type:</strong>{" "}
                  {repair.assessment.is_remote ? "Remote" : "On-site"}
                </p>
              </div>
            </section>
          )}

          {/* QUOTATION */}
          {repair.quotation && (
            <section>
              <h2 className="text-lg font-semibold mb-3">
                Quotation
              </h2>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-medium">Services</p>
                  <ul className="list-disc ml-5">
                    {repair.quotation.services.map((s, i) => (
                      <li key={i}>{s.name}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="font-medium">Parts</p>
                  <ul className="list-disc ml-5">
                    {repair.quotation.parts.map((p, i) => (
                      <li key={i}>
                        {p.name} – ₱{p.cost}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex justify-between items-center pt-2 border-t">
                  <p className="font-semibold text-gray-900">
                    Total: ₱{repair.quotation.estimated_cost}
                  </p>
                  <p className="text-gray-600">
                    Deadline:{" "}
                    {formatDate(repair.quotation.estimated_completion_time)}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* ACTIONS */}
          {(canApproveQuotation(repair) || canCancelRequest(repair)) && (
            <section className="border-t pt-6">
              <h2 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">
                Your Action Required
              </h2>

              <div className="flex flex-wrap gap-4">

                {canApproveQuotation(repair) && (
                  <button
                    onClick={handleApproveAndPay}
                    disabled={actionLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium disabled:opacity-50"
                  >
                    Approve & Proceed to Payment
                  </button>
                )}

                {canCancelRequest(repair) && (
                  <button
                    onClick={cancelRequest}
                    disabled={actionLoading}
                    className="border border-red-500 bg-white text-red-600 px-6 py-2.5 rounded-lg font-medium hover:bg-red-500 hover:text-white transition disabled:opacity-50"
                  >
                    Cancel Request
                  </button>
                )}

              </div>
            </section>
          )}

          {/* PAYMENT INVOICE */}
          {repair.payment && (
            <section className="bg-green-50 border border-green-200 rounded-lg p-5 space-y-3">
              <h2 className="font-semibold text-green-800">
                Payment Invoice
              </h2>

              {/* Waiting for shop */}
              {!repair.payment.payment_link && (
                <p className="text-sm text-green-700">
                  Waiting for the shop to generate your payment invoice.
                </p>
              )}

              {/* Invoice available but unpaid */}
              {repair.payment.payment_link && !repair.payment.paid_at && (
                <>
                  <p className="text-sm">
                    Amount Due:{" "}
                    <strong>₱{repair.payment.amount}</strong>
                  </p>

                  <a
                    href={repair.payment.payment_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-medium"
                  >
                    View Invoice & Pay
                  </a>

                  <p className="text-xs text-gray-500">
                    You will be redirected to the secure payment page.
                  </p>
                </>
              )}

              {/* Paid */}
              {repair.payment.paid_at && (
                <>
                  <p className="text-sm text-green-700 font-medium">
                    Payment Completed
                  </p>

                  <p className="text-xs text-gray-600">
                    Paid on {formatDate(repair.payment.paid_at)}
                  </p>

                  <a
                    href={repair.payment.payment_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-green-600 text-green-700 px-5 py-2 rounded-lg text-sm hover:bg-green-100"
                  >
                    View Invoice
                  </a>
                </>
              )}
            </section>
          )}

          {/* AWAITING REPAIR START */}
          {isAwaitingRepairStart(repair) && (
            <section className="bg-blue-50 border border-blue-200 rounded-lg p-5 text-sm">
              <h2 className="font-semibold text-blue-800 mb-1">
                Awaiting Repair Start
              </h2>

              <p className="text-blue-700">
                Your payment has been received. The shop will begin the repair shortly.
                You’ll see updates here once the repair is in progress.
              </p>
            </section>
          )}


          {/* STATUS */}
          {isInProgress(repair) && (
            <div className="text-orange-700 text-sm font-medium">
              Repair is currently in progress.
            </div>
          )}

          {isCompleted(repair) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h2 className="font-semibold mb-1 text-green-800">
                Repair Completed
              </h2>
              <p className="text-sm">
                Your device has been repaired successfully.
              </p>
            </div>
          )}

          {/* DISPUTE SECTION */}
          {isCompleted(repair) && (
            <section className="border-t pt-6 space-y-4">

              {/* OPEN DISPUTE */}
              {canOpenDispute({ ...repair, dispute }) && !dispute && (
                <>
                  <h2 className="font-semibold text-gray-900">
                    Problem with the repair?
                  </h2>

                  <p className="text-sm text-gray-600">
                    If the repair was not done properly, you may open a dispute within
                    7 days after completion.
                  </p>

                  <textarea
                    rows={4}
                    value={disputeText}
                    onChange={(e) => setDisputeText(e.target.value)}
                    className="w-full border rounded-lg p-3 text-sm"
                    placeholder="Explain what went wrong with the repair..."
                  />

                  <button
                    onClick={async () => {
                      if (!disputeText.trim()) return;

                      setSubmittingDispute(true);
                      await axios.post(
                        `${API_BASE}/api/disputes`,
                        {
                          request_id: repair.id,
                          explanation: disputeText,
                        },
                        { headers: { Authorization: `Bearer ${token}` } }
                      );
                      setDisputeText("");
                      setSubmittingDispute(false);
                      fetchRepair();
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
                  >
                    Open Dispute
                  </button>
                </>
              )}
            </section>
          )}
              {/* EXISTING DISPUTE */}
              {dispute && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5 space-y-4">
                  <h2 className="font-semibold text-yellow-800">
                    Repair Dispute
                  </h2>

                  <p className="text-sm text-gray-700">
                    Status:{" "}
                    <strong className="uppercase">
                      {dispute.status.replace("_", " ")}
                    </strong>
                  </p>

                  {/* MESSAGE HISTORY */}
                  <div className="space-y-3 mt-3">
                    {disputeEdits.map((edit, index) => (
                      <div
                        key={index}
                        className={`rounded-lg p-3 text-sm ${
                          edit.edited_by === "CLIENT"
                            ? "bg-white border border-gray-200"
                            : "bg-blue-50 border border-blue-200"
                        }`}
                      >
                        <p className="font-medium text-xs mb-1 text-gray-600">
                          {edit.edited_by === "CLIENT" ? "You" : "Shop"}
                          <span className="ml-2 text-gray-400">
                            • {formatDate(edit.created_at)}
                          </span>
                        </p>

                        <p className="text-gray-800 leading-relaxed">
                          {edit.content}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* DISPUTE REJECTED — WHAT NOW */}
                  {dispute.status === "REJECTED" && (
                    <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 space-y-3 text-sm text-gray-700">
                      <p className="font-medium">
                        Dispute closed without agreement
                      </p>

                      <p className="leading-relaxed">
                        You rejected the shop's proposed resolution. This dispute is now closed,
                        and no further actions can be taken within the platform.
                      </p>

                      <p className="text-xs text-gray-500">
                        If you believe further action is necessary, you may contact support or
                        reach out to the shop directly.
                      </p>

                      {/* CONTACT SUPPORT CTA */}
                      <button
                        onClick={() => navigate("/help")}
                        className="inline-flex items-center gap-2 text-sm font-medium bg-white text-blue-600 hover:underline"
                      >
                        Contact Support →
                      </button>
                    </div>
                  )}


                  {/* PROPOSED RESOLUTION */}
                  {dispute.proposed_resolution && (
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">Proposed Resolution:</span>{" "}
                      {dispute.proposed_resolution}
                    </p>
                  )}

                  {/* CLIENT CONFIRMATION MESSAGE (AFTER ACCEPTING) */}
                  {dispute.status === "RESOLVED" && dispute.proposed_resolution && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
                      {getPostResolutionMessage(dispute.proposed_resolution)}
                    </div>
                  )}


                  {/* CLIENT ACTIONS */}
                  {dispute.status === "SHOP_PROPOSED" && (
                    <div className="flex gap-4 mt-4">
                      <button
                        onClick={async () => {
                          await axios.post(
                            `${API_BASE}/api/disputes/${dispute.id}/accept`,
                            {},
                            { headers: { Authorization: `Bearer ${token}` } }
                          );
                          fetchRepair();
                        }}
                        className="bg-green-600 text-white px-5 py-2 rounded-lg"
                      >
                        Accept
                      </button>

                      <button
                        onClick={async () => {
                          await axios.post(
                            `${API_BASE}/api/disputes/${dispute.id}/reject`,
                            {},
                            { headers: { Authorization: `Bearer ${token}` } }
                          );
                          fetchRepair();
                        }}
                        className="border border-red-500 bg-red-500 text-white px-5 py-2 rounded-lg"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              )}

          {dispute && dispute.status !== "RESOLVED" && !repair.review && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              You can’t leave a review while a dispute is ongoing.  
              Once the dispute is resolved, you'll be able to review the repair.
            </div>
          )}

          {/* REVIEW */}
          {canLeaveReview(repair, dispute) && (
            <section className="border-t pt-6">
              <h2 className="font-semibold text-gray-900 mb-3">
                Leave a Review
              </h2>

              <ReviewForm
                requestId={repair.id}
                onSuccess={fetchRepair}
              />
            </section>
          )}

          {repair.review && (
            <section className="border border-gray-200 rounded-xl bg-white p-6 shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Your Review
                </h2>

                <span className="text-xs text-gray-500">
                  {formatDate(repair.review.created_at)}
                </span>
              </div>

              {/* Stars */}
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={
                      star <= repair.review.rating
                        ? "text-yellow-400 text-lg"
                        : "text-gray-300 text-lg"
                    }
                  >
                    ★
                  </span>
                ))}

                <span className="ml-2 text-sm text-gray-600">
                  {repair.review.rating}/5
                </span>
              </div>

              {/* Feedback */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 leading-relaxed italic">
                  “{repair.review.feedback}”
                </p>
              </div>
            </section>
          )}


        </div>
      </main>
    </div>
  );

};

export default ClientRepairDetails;
