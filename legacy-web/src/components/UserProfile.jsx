import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL;

const UserProfile = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editingDeviceId, setEditingDeviceId] = useState(null);


  const fetchProfile = async () => {
    try {
      const res = await axios.get(
        `${API_BASE}/api/user/profile`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setProfile(res.data.user);
    } catch (err) {
      console.error("❌ LOAD PROFILE:", err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const getUserFromToken = () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return null;

      const base64Payload = token.split(".")[1];
      const normalized = base64Payload
        .replace(/-/g, "+")
        .replace(/_/g, "/");

      const decoded = JSON.parse(atob(normalized));
      return decoded;
    } catch (err) {
      console.error("❌ Invalid JWT:", err);
      return null;
    }
  };



const user = getUserFromToken();

  /* =========================
     DEVICES STATE
  ========================= */
  const [devices, setDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [form, setForm] = useState({
    name: "",
    brand: "",
    model: "",
    serial_number: "",
    model_number: "",
  });

  const token = localStorage.getItem("token");

  /* =========================
     FETCH DEVICES
  ========================= */
  const fetchDevices = async () => {
    try {
      const res = await axios.get(
        `${API_BASE}/api/user/devices`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setDevices(res.data.devices || []);
    } catch (err) {
      console.error("❌ LOAD DEVICES:", err);
    } finally {
      setLoadingDevices(false);
    }
  };

  // Mounting
  useEffect(() => {
    fetchProfile();
    fetchDevices();
  }, []);

  /* =========================
     CLICK OUTSIDE DROPDOWN
  ========================= */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = (firstName = "", lastName = "") => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last).toUpperCase();
  };
  console.log(getInitials(user.first_name, user.last_name));

  /* =========================
     ADD DEVICE
  ========================= */
  const handleSaveDevice = async () => {
    const fd = new FormData();

    fd.append("name", form.name);
    fd.append("brand", form.brand);
    fd.append("model", form.model);
    fd.append("serial_number", form.serial_number);
    fd.append("model_number", form.model_number);

    if (form.photo) {
      fd.append("photo", form.photo);
    }

    try {
      if (editingDeviceId) {
        // 🔁 UPDATE
        await axios.put(
          `${API_BASE}/api/user/devices/${editingDeviceId}`,
          fd,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );
      } else {
        // ➕ CREATE
        await axios.post(
          `${API_BASE}/api/user/devices`,
          fd,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );
      }

      setShowAddModal(false);
      setEditingDeviceId(null);
      setForm({
        name: "",
        brand: "",
        model: "",
        serial_number: "",
        model_number: "",
        photo: null,
      });

      fetchDevices();
    } catch (err) {
      console.error("❌ SAVE DEVICE:", err);
      alert("Failed to save device");
    }
  };



  return (
    <div className="bg-gray-50 text-gray-900 min-h-screen">
      <main className="max-w-7xl mx-auto px-4 py-8 w-full">

        {/* =========================
            PROFILE HEADER
        ========================= */}
        <header className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
          <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-blue-600 flex items-center justify-center">
          <span className="text-white text-2xl font-bold tracking-wide">
            {profile
              ? getInitials(profile.first_name, profile.last_name)
              : "U"}
          </span>
          </div>
            <div>
              <h1 className="text-2xl font-bold">
                {loadingProfile
                  ? "Loading…"
                  : `${profile?.first_name} ${profile?.last_name}`}
              </h1>

              <p className="text-sm text-green-600 font-medium">
                Verified User
              </p>
            </div>
          </div>

          {/* TABS */}
          <nav className="mt-6 border-b border-gray-200">
            <div className="flex space-x-6">
              <span className="py-3 px-1 text-sm font-medium border-b-2 border-blue-600 text-blue-600">
                Devices
              </span>
              <span className="py-3 px-1 text-sm font-medium text-gray-400">
                Vouchers (Coming Soon)
              </span>
            </div>
          </nav>
        </header>

        {/* =========================
            DEVICES SECTION
        ========================= */}
        <section className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Saved Devices</h2>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              + Add Device
            </button>
          </div>

          {loadingDevices && (
            <p className="text-sm text-gray-500">Loading devices…</p>
          )}

          {!loadingDevices && devices.length === 0 && (
            <p className="text-sm text-gray-500">
              No devices added yet.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {devices.map((device) => (
              <div
                key={device.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden"
              >
                {/* IMAGE */}
                <img
                  src={
                    device.photo_url
                      ? `${API_BASE}${device.photo_url}`
                      : "https://placehold.co/300x200?text=Device"
                  }
                  className="w-full h-40 object-contain bg-gray-100 p-4"
                  alt={device.name}
                />

                {/* CONTENT */}
                <div className="p-4 text-sm space-y-1 flex-1">
                  <p><strong>Name:</strong> {device.name}</p>
                  <p><strong>Brand:</strong> {device.brand}</p>
                  <p><strong>Model:</strong> {device.model}</p>

                  <p className="text-xs text-gray-500 mt-2">
                    Added {new Date(device.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* ACTIONS */}
                <div className="px-4 py-3 border-t bg-gray-50 flex justify-end gap-4">
                  <button
                    className="text-sm font-medium bg-blue-600 text-white hover:text-blue-800"
                    onClick={() => {
                      setForm({
                        name: device.name,
                        brand: device.brand,
                        model: device.model,
                        serial_number: device.serial_number,
                        model_number: device.model_number,
                        photo: null, // don't preload file inputs
                      });
                      setEditingDeviceId(device.id);
                      setShowAddModal(true);
                    }}
                  >
                    Edit
                  </button>

                  <button
                    className="text-sm font-medium text-white bg-red-500 hover:text-red-800"
                    onClick={async () => {
                      if (!confirm("Delete this device?")) return;

                      await axios.delete(
                        `${API_BASE}/api/user/devices/${device.id}`,
                        {
                          headers: { Authorization: `Bearer ${token}` },
                        }
                      );
                      fetchDevices();
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

        </section>
      </main>

      {/* =========================
        DEVICE MODAL
      ========================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md space-y-4">
            {editingDeviceId ? "Edit Device" : "Add Device"}

            <input
              className="w-full border rounded p-2"
              placeholder="Device Name"
              value={form.name}
              onChange={(e) =>
                setForm({ ...form, name: e.target.value })
              }
            />
            <input
              className="w-full border rounded p-2"
              placeholder="Brand"
              value={form.brand}
              onChange={(e) =>
                setForm({ ...form, brand: e.target.value })
              }
            />
            <input
              className="w-full border rounded p-2"
              placeholder="Model"
              value={form.model}
              onChange={(e) =>
                setForm({ ...form, model: e.target.value })
              }
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setForm({ ...form, photo: e.target.files[0] })
              }
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleSaveDevice}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                {editingDeviceId ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
