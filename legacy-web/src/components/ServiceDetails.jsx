import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { ROUTES } from "../constants/routes";

const API_BASE = import.meta.env.VITE_API_URL;

const ServiceDetails = () => {
  const { serviceKey } = useParams();

  const [service, setService] = useState(null);
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchService = async () => {
      try {
        const res = await axios.get(
          `${API_BASE}/api/public/services/${serviceKey}`
        );

        setService(res.data.service || null);
        setShops(res.data.shops || []);
      } catch (err) {
        console.error("❌ LOAD SERVICE:", err);
        setService(null);
      } finally {
        setLoading(false);
      }
    };

    fetchService();
  }, [serviceKey]);

  /* =========================
     STATES
  ========================= */
  if (loading) {
    return (
      <div className="p-10 text-center text-gray-500">
        Loading service…
      </div>
    );
  }

  if (!service) {
    return (
      <div className="p-10 text-center text-red-600">
        Service not found
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen text-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-12">

        {/* =========================
            SERVICE INFO
        ========================= */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h1 className="text-3xl font-bold">
            {service.name}
          </h1>

          <p className="text-sm text-gray-500 mt-1">
            Category: {service.category}
          </p>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Price Range</p>
              <p className="font-semibold">
                ₱{service.min_price} – ₱{service.max_price}
              </p>
            </div>

            <div>
              <p className="text-gray-500">Estimated Time</p>
              <p className="font-medium">
                {service.min_estimated_time} – {service.max_estimated_time}
              </p>
            </div>
          </div>
        </section>

        {/* =========================
            SHOPS OFFERING SERVICE
        ========================= */}
        <section>
          <h2 className="text-2xl font-bold mb-6">
            Shops Offering This Service
          </h2>

          {shops.length === 0 ? (
            <p className="text-sm text-gray-500">
              No verified shops currently offer this service.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {shops.map((shop) => (
                <div
                  key={shop.shop_id}
                  className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col"
                >
                  {/* SHOP HEADER */}
                  <div className="mb-2">
                    <h3 className="font-semibold text-lg">
                      {shop.shop_name}
                    </h3>

                    <p className="text-yellow-500 text-sm">
                      ★ {shop.rating_average}
                    </p>
                  </div>

                  {/* ADDRESS */}
                  <p className="text-xs text-gray-500 mb-3">
                    {shop.street}, {shop.barangay}, {shop.province}
                  </p>

                  {/* PRICE + TIME */}
                  <div className="text-sm space-y-1 mb-4">
                    <p>
                      Price:{" "}
                      <strong>₱{shop.base_price}</strong>
                    </p>
                    <p className="text-gray-500">
                      Est. Time: {shop.estimated_timeframe}
                    </p>
                  </div>

                  {/* VERIFIED BADGE */}
                  {shop.is_verified && (
                    <span
                      className="inline-flex items-center gap-1
                        text-xs font-medium bg-green-100 text-green-700
                        px-3 py-1 rounded-full w-fit mb-4"
                    >
                      ✔ Verified Shop
                    </span>
                  )}

                  {/* CTA */}
                  <Link
                    to={ROUTES.SHOP_DETAIL(shop.shop_id)}
                    className="mt-auto text-center bg-blue-600 hover:bg-blue-700
                      text-white rounded-lg py-2 text-sm font-medium transition"
                  >
                    View Shop
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ServiceDetails;
