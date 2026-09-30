// src/components/business/RepairAssessmentNoQuotation.jsx
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import QuotationModal from "./QuotationModal.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://72.62.248.151";

const RepairAssessmentNoQuotation = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [repair, setRepair] = useState(null);
  const [loading, setLoading] = useState(true);

  const [generatingPayment, setGeneratingPayment] = useState(false);

  /* ----------------------------------
    Quotation state
  ---------------------------------- */
  const [quotation, setQuotation] = useState(null);
  const [showQuotationModal, setShowQuotationModal] = useState(false);


  /* ----------------------------------
    Employee Assignment State
  ---------------------------------- */
  const [employees, setEmployees] = useState([]);
  const [assignedEmployee, setAssignedEmployee] = useState(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(false);


  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await axios.get(
          `${API_BASE}/api/business/employees`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setEmployees(res.data.employees || []);
      } catch (err) {
        console.error("❌ Failed to load employees:", err);
      }
    };

    fetchEmployees();
  }, []);

  const fetchAssignment = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await axios.get(
        `${API_BASE}/api/business/repairs/${id}/assignment`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAssignedEmployee(res.data.assignment || null);
    } catch (err) {
      console.error("❌ Failed to load assignment:", err);
    }
  };

  useEffect(() => {
    fetchAssignment();
  }, [id]);


  const handleAssignEmployee = async () => {
    if (!selectedEmployeeId) return;

    try {
      setAssigning(true);
      const token = localStorage.getItem("token");

      await axios.post(
        `${API_BASE}/api/business/repairs/${id}/assign`,
        { employeeId: selectedEmployeeId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // ✅ INSTANT UI UPDATE (no refresh needed)
      const selectedEmployee = employees.find(
        emp => emp.id === Number(selectedEmployeeId)
      );

      if (selectedEmployee) {
        setAssignedEmployee(selectedEmployee);
      }

      setSelectedEmployeeId("");
      setEditingAssignment(false);

      // ✅ OPTIONAL: refetch to stay in sync with DB
      fetchAssignment();

    } catch (err) {
      console.error("❌ Failed to assign employee:", err);
      alert("Failed to assign employee");
    } finally {
      setAssigning(false);
    }
  };

  const handleGeneratePaymentLink = async () => {
    try {
      setGeneratingPayment(true);
      const token = localStorage.getItem("token");

      await axios.post(
        `${API_BASE}/api/business/repairs/${id}/payments/generate-link`,
        { request_id: id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("Payment link generated and sent to client");

      // 🔄 Refresh repair details to get paymentLink
      const res = await axios.get(
        `${API_BASE}/api/business/repairs/details/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setRepair(res.data.repair);

    } catch (err) {
      alert(err?.response?.data?.message || "Failed to generate payment link");
    } finally {
      setGeneratingPayment(false);
    }
  };


  const handleStartRepair = async () => {
    try {
      const token = localStorage.getItem("token");

      await axios.post(
        `${API_BASE}/api/business/repairs/${id}/start`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert("Repair started");
      navigate(`/business/repairs/${id}/in-progress`);
    } catch (err) {
      alert(err?.response?.data?.message || "Cannot start repair");
    }
  };




  /* ----------------------------------
     Assessment state
  ---------------------------------- */
  const [assessment, setAssessment] = useState(null);
  const [deviceCondition, setDeviceCondition] = useState("");
  const [observedIssues, setObservedIssues] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [isRemote, setIsRemote] = useState(false);

  /* ----------------------------------
     Modal state
  ---------------------------------- */
  const [isModalOpen, setIsModalOpen] = useState(false);

  /* ----------------------------------
     Load assessment (if exists)
  ---------------------------------- */
  useEffect(() => {
    const fetchAssessment = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await axios.get(
          `${API_BASE}/api/business/repairs/${id}/assessment`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data.assessment) {
          const a = res.data.assessment;
          setAssessment(a);
          setDeviceCondition(a.deviceCondition || "");
          setObservedIssues(a.observedIssues || "");
          setRecommendation(a.recommendation || "");
          setIsRemote(!!a.isRemote);
        }
      } catch (err) {
        console.error("❌ Failed to load assessment:", err);
      }
    };

    fetchAssessment();
  }, [id]);

  // Fetch Repair Details (to verify status)
  useEffect(() => {
    const fetchRepairDetails = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await axios.get(
          `${API_BASE}/api/business/repairs/details/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setRepair(res.data.repair);
      } catch (err) {
        console.error("❌ Failed to load repair details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRepairDetails();
  }, [id]);

  // Redirect based on repair status
  useEffect(() => {
    if (!repair) return;

    // ❌ If not accepted, kick out FIRST
    if (repair.decisionStatus !== "ACCEPTED") {
      navigate("/business/repairs", { replace: true });
      return;
    }

    // ✅ If already in progress, redirect
    if (repair.status === "IN_PROGRESS") {
      navigate(`/business/repairs/${id}/in-progress`, { replace: true });
      return;
    }

    // ✅ If completed, redirect
    if (repair.status === "COMPLETED") {
      navigate(`/business/repairs/${id}/completed`, { replace: true });
      return;
    }

  }, [repair, navigate, id]);




  /* ----------------------------------
     Submit assessment
  ---------------------------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");

      await axios.post(
        `${API_BASE}/api/business/repairs/${id}/assessment`,
        {
          deviceCondition,
          observedIssues,
          recommendation,
          isRemote,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const res = await axios.get(
        `${API_BASE}/api/business/repairs/${id}/assessment`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAssessment(res.data.assessment);
      setIsModalOpen(false);
      alert("Assessment saved successfully");

    } catch (error) {
      console.error("❌ Failed to save assessment:", error);
      alert(error?.response?.data?.message || "Failed to save assessment");
    }
  };

const fetchQuotation = async () => {
  try {
    const token = localStorage.getItem("token");

    const res = await axios.get(
      `${API_BASE}/api/business/repairs/${id}/quotation`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (res.data.quotation) {
      setQuotation(res.data);
    } else {
      setQuotation(null);
    }
  } catch (err) {
    console.error("❌ Failed to load quotation:", err);
  }
};

useEffect(() => {
  fetchQuotation();
}, [id]);
  
  if (loading) return null;
  if (!repair) return null;

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Request #{id}</h1>
        <span className="text-sm font-medium bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
          Awaiting Quotation
        </span>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-100">

        {/* Request Details */}
        <section className="bg-gray-100/50 p-6 rounded-t-lg">
          <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3 mb-4">
            Request Information
          </h2>

          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {repair.deviceType}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Device</label>
                <p className="text-sm text-gray-800">{repair.deviceType}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Service Type</label>
                <p className="text-sm text-gray-800">{repair.deliveryMethod}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Address</label>
                <p className="text-sm text-gray-800">
                  {repair.pickupAddress || "N/A"}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Preferred Time</label>
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
            </div>
          </div>

          <div className="mt-6">
            <label className="text-sm font-medium text-gray-500">Description</label>
            <p className="text-sm text-gray-800">{repair.issueDescription}</p>
          </div>
        </section>


        {/* ASSESSMENT SECTION */}
        <section className="p-6 border-t border-gray-200">
          <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Assessment</h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-white text-sm font-medium text-blue-600 hover:text-blue-800">
              {assessment ? "Edit" : "Add Assessment"}
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">
                Device Condition
              </label>
              <p className="text-sm text-gray-800">
                {assessment?.deviceCondition || "No assessment yet"}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                Observed Issues
              </label>
              <p className="text-sm text-gray-800">
                {assessment?.observedIssues || "No assessment yet"}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                Recommendation
              </label>
              <p className="text-sm text-gray-800">
                {assessment?.recommendation || "No assessment yet"}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">
                Remote Assessment
              </label>
              <p className="text-sm text-gray-800">
                {assessment ? (assessment.isRemote ? "Yes" : "No") : "—"}
              </p>
            </div>
          </div>
        </section>

        {/* QUOTATION SECTION */}
        <section className="p-6 border-t border-gray-200">
          <div className="flex justify-between items-center border-b pb-3 mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Quotation</h2>

            {/* Add / Edit button */}
            {assessment && (
              <button
                onClick={() => setShowQuotationModal(true)}
                className="text-sm bg-white font-medium text-blue-600 hover:text-blue-800"
              >
                {quotation ? "Edit Quotation" : "Add Quotation"}
              </button>
            )}
          </div>

          {/* Existing quotation (READ-ONLY SUMMARY) */}
          {quotation ? (
            <div className="space-y-4 text-sm">

              {/* SERVICES */}
              {quotation.services?.length > 0 && (
                <div>
                  <p className="font-medium text-gray-800 mb-1">
                    Services
                  </p>
                  <ul className="space-y-1">
                    {quotation.services.map((s, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{s.name}</span>
                        <span>₱{Number(s.base_price).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* PARTS */}
              {quotation.parts?.length > 0 && (
                <div>
                  <p className="font-medium text-gray-800 mt-3 mb-1">
                    Parts
                  </p>
                  <ul className="space-y-1">
                    {quotation.parts.map((p, i) => (
                      <li key={i} className="flex justify-between">
                        <span>{p.name}</span>
                        <span>₱{Number(p.cost).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* TOTAL */}
              <div className="border-t pt-3 flex justify-between font-semibold text-gray-900">
                <span>Total Estimated Cost</span>
                <span>₱{Number(quotation.quotation.estimated_cost).toLocaleString()}</span>
              </div>

              {/* WARRANTY */}
              {quotation.warranty && (
                <p className="text-xs text-gray-600">
                  Warranty: {quotation.warranty.warranty_value}{" "}
                  {quotation.warranty.warranty_unit.toLowerCase()}
                </p>
              )}

              {/* STATUS */}
              <p className="text-xs text-gray-500">
                Status: {quotation.quotation.status}
              </p>

            </div>
          ) : (
            <p className="text-sm text-gray-500">No quotation added yet.</p>
          )}

        </section>

        {/* QUOTATION MODAL */}
        {showQuotationModal && (
          <QuotationModal
            requestId={id}
            existingQuotation={quotation}   // null = add, object = edit
            onClose={() => setShowQuotationModal(false)}
            onSaved={() => {
              setShowQuotationModal(false);
              fetchQuotation();
            }}
          />
        )}

        {/* EMPLOYEE ASSIGNMENT */}
        <section className="p-6 border-t border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Assigned Technician
          </h2>

          {assignedEmployee && !editingAssignment ? (
            <div className="flex justify-between items-center text-sm">
              <div className="space-y-1">
                <p>
                  <strong>Name:</strong>{" "}
                  {assignedEmployee.first_name} {assignedEmployee.last_name}
                </p>
                <p>
                  <strong>Role:</strong> {assignedEmployee.role}
                </p>
              </div>

              <button
                onClick={() => setEditingAssignment(true)}
                className="bg-white text-blue-600 text-sm hover:underline"
              >
                Change
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-4">
              No employee assigned yet.
            </p>
          )}

          {/* Assign dropdown */}
          {(!assignedEmployee || editingAssignment) && (
            <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    setEditingAssignment(false);
                    setSelectedEmployeeId("");
                  }}
                  className="bg-red-500 text-sm text-white"
                >
                  Cancel
                </button>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="flex-1 rounded-md border-gray-300 p-2 text-sm"
              >
                <option value="">Select employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name} ({emp.role})
                  </option>
                ))}
              </select>

            <button
              onClick={handleAssignEmployee}
              disabled={!selectedEmployeeId || assigning}
              className="px-4 py-2 rounded bg-blue-600 text-white text-sm disabled:opacity-50"
            >
              {assignedEmployee ? "Update Assignment" : "Assign"}
            </button>
            </div>
          )}
        </section>



      </div>
      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Add Assessment</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <textarea
                placeholder="Device condition"
                className="w-full rounded-md border-gray-200 bg-gray-100 p-2"
                value={deviceCondition}
                onChange={(e) => setDeviceCondition(e.target.value)}
                required
              />

              <textarea
                placeholder="Observed issues"
                className="w-full rounded-md border-gray-200 bg-gray-100 p-2"
                value={observedIssues}
                onChange={(e) => setObservedIssues(e.target.value)}
                required
              />

              <textarea
                placeholder="Recommendation"
                className="w-full rounded-md border-gray-200 bg-gray-100 p-2"
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                required
              />

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isRemote}
                  onChange={(e) => setIsRemote(e.target.checked)}
                />
                Remote assessment
              </label>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-600 text-white"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}







      {/* ACTION BUTTONS */}
      <div className="flex justify-end gap-4 mt-6">

        {/* PAYMENT STATUS / ACTIONS */}
        {quotation && (
          <div className="flex flex-col items-end gap-1">

            {/* PAID STATE */}
            {repair.paymentStatus === "PAID" && (
              <span className="flex items-center gap-1 text-sm font-medium text-green-600">
                Client Paid  ✅ 
              </span>
            )}

            {/* GENERATE / SENT STATE */}
            {repair.paymentStatus !== "PAID" && (
              <>
                <button
                  onClick={handleGeneratePaymentLink}
                  disabled={!!repair.paymentLink || generatingPayment}
                  className={`px-6 py-2 rounded-lg text-sm font-medium ${
                    repair.paymentLink || generatingPayment
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {repair.paymentLink
                    ? "Payment Link Sent"
                    : generatingPayment
                    ? "Generating..."
                    : "Generate Payment Link"}
                </button>

                {/* WAITING */}
                {repair.paymentLink && repair.paymentStatus === "PENDING" && (
                  <span className="text-xs text-gray-500">
                    Waiting for client payment…
                  </span>
                )}
              </>
            )}
          </div>
        )}

        {/* START REPAIR */}
        <button
          disabled={
            !assessment ||
            !assignedEmployee ||
            repair.paymentStatus !== "PAID"
          }
          onClick={handleStartRepair}
          className={`px-6 py-2 rounded-lg text-white text-sm font-medium shadow-sm ${
            assessment &&
            assignedEmployee &&
            repair.paymentStatus === "PAID"
              ? "bg-green-600 hover:bg-green-700"
              : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          Start Repair
        </button>

      </div>
    </main>
  );
};

export default RepairAssessmentNoQuotation;
