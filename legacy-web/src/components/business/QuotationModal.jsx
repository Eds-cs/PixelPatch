// src/components/business/QuotationModal.jsx
import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://72.62.248.151";

export default function QuotationModal({ requestId, onClose, onSaved, existingQuotation }) {
  const [estimatedCompletionTime, setEstimatedCompletionTime] = useState("");
  const [partsNeeded, setPartsNeeded] = useState(false);
  const [parts, setParts] = useState([]);

  const [warrantyCovered, setWarrantyCovered] = useState(false);
  const [warrantyValue, setWarrantyValue] = useState("");
  const [warrantyUnit, setWarrantyUnit] = useState("MONTH");

  /* ---------------------------
     Parts helpers
  ----------------------------*/
  const addPart = () => {
    setParts([...parts, { name: "", cost: "" }]);
  };

  const updatePart = (index, field, value) => {
    const updated = [...parts];
    updated[index][field] = value;
    setParts(updated);
  };

  const removePart = (index) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  useEffect(() => {
  if (!existingQuotation) return;

  setEstimatedCompletionTime(
    existingQuotation.quotation.estimated_completion_time
      ? existingQuotation.quotation.estimated_completion_time.slice(0, 16)
      : ""
  );

  setPartsNeeded(existingQuotation.quotation.is_parts_needed === 1);
  setParts(existingQuotation.parts || []);

  if (existingQuotation.warranty) {
    setWarrantyCovered(true);
    setWarrantyValue(existingQuotation.warranty.warranty_value);
    setWarrantyUnit(existingQuotation.warranty.warranty_unit);
  }
}, [existingQuotation]);


  /* ---------------------------
     Submit
  ----------------------------*/
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("token");

      const payload = {
        estimatedCompletionTime,
        isPartsNeeded: partsNeeded,
        parts: partsNeeded ? parts : [],
        warranty: warrantyCovered
          ? {
              isWarrantyCovered: true,
              warrantyValue,
              warrantyUnit
            }
          : null
      };

      if (existingQuotation) {
        // EDIT quotation
        await axios.put(
          `${API_BASE}/api/business/repairs/${requestId}/quotation`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // CREATE quotation
        await axios.post(
          `${API_BASE}/api/business/repairs/${requestId}/quotation`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      onSaved();
      onClose();
      alert("Quotation saved successfully");

    } catch (err) {
      console.error("❌ Failed to save quotation:", err);
      alert(err?.response?.data?.message || "Failed to save quotation");
    }
  };


  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Add Quotation</h2>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Completion Time */}
          <div>
            <label className="text-sm font-medium text-gray-700">
              Estimated Completion Time
            </label>
            <input
              type="datetime-local"
              value={estimatedCompletionTime}
              onChange={(e) => setEstimatedCompletionTime(e.target.value)}
              className="w-full rounded-md border-gray-200 bg-gray-100 p-2"
            />
          </div>

          {/* Parts Needed */}
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={partsNeeded}
                onChange={(e) => setPartsNeeded(e.target.checked)}
              />
              Parts required
            </label>
          </div>

          {/* Parts List */}
          {partsNeeded && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="font-medium text-sm">Parts</p>
                <button
                  type="button"
                  onClick={addPart}
                  className="text-sm text-blue-600"
                >
                  + Add Part
                </button>
              </div>

              {parts.map((part, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    placeholder="Part name"
                    value={part.name}
                    onChange={(e) => updatePart(index, "name", e.target.value)}
                    className="flex-1 rounded-md border-gray-200 bg-gray-100 p-2"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Cost"
                    value={part.cost}
                    onChange={(e) => updatePart(index, "cost", e.target.value)}
                    className="w-32 rounded-md border-gray-200 bg-gray-100 p-2"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => removePart(index)}
                    className="text-red-500 text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Warranty */}
          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={warrantyCovered}
                onChange={(e) => setWarrantyCovered(e.target.checked)}
              />
              Warranty included
            </label>
          </div>

          {warrantyCovered && (
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Duration"
                value={warrantyValue}
                onChange={(e) => setWarrantyValue(e.target.value)}
                className="flex-1 rounded-md border-gray-200 bg-gray-100 p-2"
                required
              />
              <select
                value={warrantyUnit}
                onChange={(e) => setWarrantyUnit(e.target.value)}
                className="rounded-md border-gray-200 bg-gray-100 p-2"
              >
                <option value="DAY">Days</option>
                <option value="WEEK">Weeks</option>
                <option value="MONTH">Months</option>
                <option value="YEAR">Years</option>
              </select>
            </div>
          )}

          <p className="text-xs text-gray-500">
            Estimated cost will be automatically calculated based on selected services
            and added parts.
          </p>


          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-blue-600 text-white"
            >
              Save Quotation
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
