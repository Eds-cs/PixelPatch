// src/components/ClientRepairRequestModalPage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import RepairRequestModal from "./RepairRequestModal";

const API_BASE = import.meta.env.VITE_API_URL;

export default function ClientRepairRequestModalPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const shop_id = location.state?.shop_id; // Only ID

  const [shop, setShop] = useState(null);
  const [devices, setDevices] = useState([]);
  const [addresses, setAddresses] = useState([]);

  const [services, setServices] = useState([]);               // NEW
  const [serviceTypes, setServiceTypes] = useState(null);     // NEW

  // Ensure shop_id exists
  useEffect(() => {
    if (!shop_id) {
      console.error("No shop_id passed!");
      navigate(-1);
    }
  }, [shop_id]);

  // Load shop data
  useEffect(() => {
    if (!shop_id) return;

    axios
      .get(`${API_BASE}/api/shops/${shop_id}`)
      .then((res) => setShop(res.data.shop))
      .catch((err) => {
        console.error(err);
        navigate(-1);
      });
  }, [shop_id]);

  // Load devices, addresses, services, and service types
  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");

        // Load user devices
        const devRes = await axios.get(`${API_BASE}/api/devices`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setDevices(devRes.data.devices || []);

        // Load user addresses
        const addrRes = await axios.get(`${API_BASE}/api/addresses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAddresses(addrRes.data.addresses || []);

        // Load SHOP SERVICES
        const servRes = await axios.get(
          `${API_BASE}/api/shops/${shop_id}/services`
        );
        setServices(servRes.data.services || []);

        // Load SHOP SERVICE TYPES (pickup/onsite/dropoff)
        const typeRes = await axios.get(
          `${API_BASE}/api/shop-services/types/${shop_id}`
        );
        setServiceTypes(typeRes.data.serviceTypes || null);

      } catch (error) {
        console.error("Failed loading data:", error);
      }
    };

    loadData();
  }, [shop_id]);

  if (!shop) return null;
  if (!serviceTypes) return <div>Loading options...</div>;

  return (
    <RepairRequestModal
      shop={shop}
      userDevices={devices}
      userAddresses={addresses}
      services={services}                // NEW
      serviceTypes={serviceTypes}        // NEW
      onAddressAdded={setAddresses}
      onClose={() => navigate(-1)}
    />
  );
}
