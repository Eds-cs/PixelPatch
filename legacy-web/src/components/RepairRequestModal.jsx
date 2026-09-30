// src/components/RepairRequestModal.jsx
import React, { useState } from "react";
import axios from "axios";

export default function RepairRequestModal({
  onClose,
  shop,
  userDevices,
  userAddresses,
  services,
  serviceTypes,
  onAddressAdded
}) {
  const API_BASE = import.meta.env.VITE_API_URL;

  const [addingAddress, setAddingAddress] = useState(false);

  const [newAddress, setNewAddress] = useState({
    country: "Philippines",
    region: "",
    province: "",
    city: "",
    barangay: "",
    street: "",
    postal_code: "",
    label: "",
    latitude: 0,
    longitude: 0
  });

  const [form, setForm] = useState({
    device_id: "",
    issue_description: "",
    pickup_address_id: "",
    preferred_date: "",
    notes: "",
    attachments: [],
    selected_services: [],       // MULTI SELECT
    delivery_method: ""          // PICKUP | DROPOFF | ONSITE
  });

  const [savingAddress, setSavingAddress] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ------------------------------------------
  // Address Change
  // ------------------------------------------
  const handleAddressChange = (e) => {
    setNewAddress({ ...newAddress, [e.target.name]: e.target.value });
  };

  // ------------------------------------------
  // Normal Form Change
  // ------------------------------------------
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ------------------------------------------
  // Multi-select Services Change
  // ------------------------------------------
  const handleServiceSelect = (e) => {
    const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
    setForm({ ...form, selected_services: selected });
  };

  // ------------------------------------------
  // File Upload
  // ------------------------------------------
  const handleFileUpload = (e) => {
    setForm({ ...form, attachments: e.target.files });
  };

  // ------------------------------------------
  // Save Address
  // ------------------------------------------
  const saveNewAddress = async () => {
    if (!newAddress.region || !newAddress.province || !newAddress.city || !newAddress.barangay) {
      alert("Please fill all required address fields.");
      return;
    }

    try {
      setSavingAddress(true);

      const res = await axios.post(
        `${API_BASE}/api/addresses`,
        newAddress,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );

      const created = res.data;

      onAddressAdded((prev) => [...prev, created]);

      setForm((prev) => ({ ...prev, pickup_address_id: created.id }));
      setAddingAddress(false);

    } catch (err) {
      console.error(err);
      alert("Failed to save address.");
    } finally {
      setSavingAddress(false);
    }
  };

  // ------------------------------------------
  // Submit Request
  // ------------------------------------------
  const handleSubmit = async () => {
    // Address required ONLY if pickup or dropoff
    if (form.delivery_method !== "ONSITE" && !form.pickup_address_id) {
      alert("Address is required for Pickup or Drop-off.");
      return;
    }

    // General form validation
    if (
      !form.device_id ||
      !form.issue_description ||
      !form.preferred_date ||
      form.selected_services.length === 0 ||
      !form.delivery_method
    ) {
      alert("Please fill all required fields.");
      return;
    }

    try {
      setSubmitting(true);

      const data = new FormData();

      data.append("shop_id", shop.id);
      data.append("device_id", form.device_id);
      data.append("issue_description", form.issue_description);
      data.append("preferred_date", form.preferred_date);
      data.append("notes", form.notes);

      // Only send pickup_address_id if needed
      if (form.delivery_method !== "ONSITE") {
        data.append("pickup_address_id", form.pickup_address_id);
      }

      // MULTIPLE SERVICES
      form.selected_services.forEach((id) => {
        data.append("services[]", id);
      });

      // DELIVERY METHOD
      data.append("delivery_method", form.delivery_method);

      // Attachments
      if (form.attachments.length > 0) {
        Array.from(form.attachments).forEach((file) => {
          data.append("attachments", file);
        });
      }

      await axios.post(`${API_BASE}/api/service-requests`, data, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data"
        }
      });

      alert("Service request submitted!");
      onClose();

    } catch (err) {
      console.error(err);
      alert("Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };


  if (!shop) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose}></div>

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
        <button
          onClick={onClose}
          className="absolute bg-white top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full shadow"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Request a Repair from {shop?.name}
        </h2>

        <div className="space-y-7">

          {/* DEVICE SELECT */}
          <div>
            <label className="block font-medium mb-1">Select Your Device <span className="text-red-500">*</span></label>
            <select
              name="device_id"
              value={form.device_id}
              onChange={handleChange}
              className="w-full border rounded-lg p-3 bg-gray-50"
            >
              <option value="">-- Select Device --</option>
              {userDevices?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.brand} {d.name} ({d.model})
                </option>
              ))}
            </select>
          </div>

          {/* SERVICE CHECKBOXES */}
          <div>
            <label className="block font-medium mb-1">Select Services <span className="text-red-500">*</span></label>

            <div className="space-y-2">
              {services?.map((s) => (
                <label key={s.id} className="flex items-center gap-3 p-2 border rounded-md bg-gray-50">
                  <input
                    type="checkbox"
                    value={s.id}
                    checked={form.selected_services.includes(String(s.id))}
                    onChange={(e) => {
                      const id = e.target.value;
                      let updated;

                      if (form.selected_services.includes(id)) {
                        updated = form.selected_services.filter((x) => x !== id);
                      } else {
                        updated = [...form.selected_services, id];
                      }

                      setForm({ ...form, selected_services: updated });
                    }}
                  />

                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-gray-500">₱{s.base_price}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>


          {/* DELIVERY METHOD */}
          <div>
            <label className="block font-medium mb-2">
              Delivery Method <span className="text-red-500">*</span>
            </label>

            <div className="space-y-2">
              {serviceTypes?.is_pickup == 1 && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="delivery_method"
                    value="PICKUP"
                    checked={form.delivery_method === "PICKUP"}
                    onChange={handleChange}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Pickup</span>
                </label>
              )}

              {serviceTypes?.is_dropoff == 1 && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="delivery_method"
                    value="DROPOFF"
                    checked={form.delivery_method === "DROPOFF"}
                    onChange={handleChange}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Drop-off</span>
                </label>
              )}

              {serviceTypes?.is_onsite == 1 && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="delivery_method"
                    value="ONSITE"
                    checked={form.delivery_method === "ONSITE"}
                    onChange={handleChange}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>On-site</span>
                </label>
              )}
            </div>
          </div>



          {/* ISSUE DESCRIPTION */}
          <div>
            <label className="block font-medium mb-1">Describe the Issue <span className="text-red-500">*</span></label>
            <textarea
              name="issue_description"
              value={form.issue_description}
              onChange={handleChange}
              rows="4"
              className="w-full border rounded-lg p-3 bg-gray-50"
              placeholder="Explain the problem you're experiencing..."
            />
          </div>

          {/* ADDRESS SECTION — Only show for PICKUP or DROPOFF */}
          {form.delivery_method !== "ONSITE" && (
            <>
              {!addingAddress && (
                <div>
                  <label className="block font-medium mb-1">
                    {form.delivery_method === "PICKUP"
                      ? "Pickup Address"
                      : "Drop-off Address"} <span className="text-red-500">*</span>
                  </label>

                  <select
                    name="pickup_address_id"
                    value={form.pickup_address_id}
                    onChange={handleChange}
                    className="w-full border rounded-lg p-3 bg-gray-50"
                  >
                    <option value="">-- Select Address --</option>
                    {userAddresses?.map((addr) => (
                      <option key={addr.id} value={addr.id}>
                        {addr.street}, {addr.barangay}, {addr.city}
                      </option>
                    ))}
                  </select>

                  <button
                    className="bg-white mt-3 px-3 py-1 border border-blue-600 text-blue-600 text-sm rounded hover:bg-blue-50"
                    onClick={() => setAddingAddress(true)}
                  >
                    + Add New Address
                  </button>
                </div>
              )}

              {/* NEW ADDRESS FORM */}
              {addingAddress && (
                <div className="space-y-4 border border-gray-200 p-4 rounded-lg bg-gray-50 shadow-inner">
                  <h3 className="font-semibold text-lg mb-2">Add New Address</h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      className="border p-2 rounded bg-white"
                      placeholder="Region *"
                      name="region"
                      value={newAddress.region}
                      onChange={handleAddressChange}
                    />

                    <input
                      className="border p-2 rounded bg-white"
                      placeholder="Province *"
                      name="province"
                      value={newAddress.province}
                      onChange={handleAddressChange}
                    />

                    <input
                      className="border p-2 rounded bg-white"
                      placeholder="City *"
                      name="city"
                      value={newAddress.city}
                      onChange={handleAddressChange}
                    />

                    <input
                      className="border p-2 rounded bg-white"
                      placeholder="Barangay *"
                      name="barangay"
                      value={newAddress.barangay}
                      onChange={handleAddressChange}
                    />

                    <input
                      className="border p-2 rounded bg-white col-span-full"
                      placeholder="Street (optional)"
                      name="street"
                      value={newAddress.street}
                      onChange={handleAddressChange}
                    />

                    <input
                      className="border p-2 rounded bg-white"
                      placeholder="Postal Code"
                      name="postal_code"
                      value={newAddress.postal_code}
                      onChange={handleAddressChange}
                    />

                    <input
                      className="border p-2 rounded bg-white"
                      placeholder="Label (Home/Work/etc.)"
                      name="label"
                      value={newAddress.label}
                      onChange={handleAddressChange}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3">
                    <button
                      className="px-4 py-2 bg-red-600 text-white rounded"
                      onClick={() => setAddingAddress(false)}
                    >
                      Cancel
                    </button>

                    <button
                      className="px-4 py-2 bg-blue-600 text-white rounded"
                      onClick={saveNewAddress}
                      disabled={savingAddress}
                    >
                      {savingAddress ? "Saving..." : "Save Address"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}


          {/* PREFERRED DATE */}
          <div>
            <label className="flex items-center gap-2 font-medium mb-1">
              Preferred Date <span className="text-red-500">*</span>

              {/* Info Icon */}
              <div className="relative group">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-xs cursor-pointer">
                  i
                </span>

                {/* Tooltip */}
                <div className="absolute left-0 top-7 w-64 bg-black text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                  This is the date you prefer the repair to start. Actual start time may
                  depend on shop availability.
                </div>
              </div>
            </label>

            <input
              type="datetime-local"
              name="preferred_date"
              value={form.preferred_date}
              onChange={handleChange}
              className="w-full border rounded-lg p-3 bg-gray-50"
            />
          </div>


          {/* NOTES */}
          {/* <div>
            <label className="block font-medium mb-1">Additional Notes (Optional)</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows="2"
              className="w-full border rounded-lg p-3 bg-gray-50"
            ></textarea>
          </div> */}

          {/* ATTACHMENTS */}
          <div>
            <label className="block font-medium mb-1">Upload Photos (Optional)</label>
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="w-full border rounded-lg p-3 bg-gray-50"
            />
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3 mt-8">
          <button onClick={onClose} className="px-5 py-2 bg-red-600 text-white rounded-lg">
            Cancel
          </button>

          <button
            disabled={submitting}
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:bg-blue-300"
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}
