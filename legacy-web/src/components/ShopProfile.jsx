// src/components/ShopProfile.jsx
import { Link, useParams, useLocation } from "react-router-dom";
import React, { useEffect, useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL; // VITE VERSION ✔

const ShopProfile = () => {
  const { id } = useParams();
  const location = useLocation();

  // If coming from Messages.jsx
  const shopFromState = location.state?.shop || null;

  const [shop, setShop] = useState(null);

  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [documents, setDocuments] = useState([]);

  const [loadingShop, setLoadingShop] = useState(false);
  const [loadingExtras, setLoadingExtras] = useState(false);
  const [error, setError] = useState(null);

  const [showHours, setShowHours] = useState(false);




  /* -----------------------------------------------------------
     FETCH MAIN SHOP DATA
  ----------------------------------------------------------- */
  useEffect(() => {
    if (!id) return;

    // If shop was passed via link state (Chat button)
    if (shopFromState) {
      setShop(shopFromState);
      return;
    }

    setLoadingShop(true);
    setError(null);

    axios
      .get(`${API_BASE}/api/shops/${id}`)
      .then((res) => {
        if (res?.data?.shop) {
          setShop(res.data.shop);
        } else {
          setError("Shop not found.");
        }
      })
      .catch((err) => {
        console.error("Shop fetch error:", err);
        setError("Failed to load shop.");
      })
      .finally(() => setLoadingShop(false));
  }, [id]);

  /* -----------------------------------------------------------
     FETCH EXTRAS — services, reviews, documents
  ----------------------------------------------------------- */
  useEffect(() => {
    if (!shop?.id) return;

    setLoadingExtras(true);

    const reqServices = axios
      .get(`${API_BASE}/api/shops/${shop.id}/services`)
      .then((r) => setServices(r.data.services || []))
      .catch(() => setServices([]));

    const reqReviews = axios
      .get(`${API_BASE}/api/shops/${shop.id}/reviews`)
      .then((r) => setReviews(r.data.reviews || []))
      .catch(() => setReviews([]));

    const reqDocuments = axios
      .get(`${API_BASE}/api/shops/${shop.id}/documents`)
      .then((r) => setDocuments(r.data.documents || []))
      .catch(() => setDocuments([]));

    Promise.all([reqServices, reqReviews, reqDocuments]).finally(() =>
      setLoadingExtras(false)
    );
  }, [shop]);

  /* -----------------------------------------------------------
     RENDER CONDITIONS
  ----------------------------------------------------------- */
  if (loadingShop) return <div className="p-6">Loading shop...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!shop) return null;

  /* -----------------------------------------------------------
     HELPERS
  ----------------------------------------------------------- */

  const ratingCount = Math.round(shop.rating_average ?? shop.rating ?? 0);

  const addressParts = [
    shop.street,
    shop.barangay,
    shop.province || shop.region,
    shop.country,
  ]
    .filter(Boolean)
    .join(", ");

    /* -----------------------------------------------------------
      TIME & STATUS HELPERS
    ----------------------------------------------------------- */

    const formatTime = (time) => {
      if (!time) return "";
      const [h, m] = time.split(":").map(Number);
      const d = new Date();
      d.setHours(h, m);
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    };

    const DAYS = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

  const isShopOpenNow = () => {
    if (!shop?.open_time || !shop?.closing_time || !shop?.days_from || !shop?.days_to) {
      return false;
    }

    const now = new Date();
    const currentDayIndex = now.getDay(); // 0 = Sunday
    const currentDayName = DAYS[currentDayIndex];

    const fromIndex = DAYS.indexOf(shop.days_from);
    const toIndex = DAYS.indexOf(shop.days_to);

    if (fromIndex === -1 || toIndex === -1) return false;

    // ✅ DAY CHECK (handles wrap-around like Fri → Mon)
    const isDayOpen =
      fromIndex <= toIndex
        ? currentDayIndex >= fromIndex && currentDayIndex <= toIndex
        : currentDayIndex >= fromIndex || currentDayIndex <= toIndex;

    if (!isDayOpen) return false;

    // ✅ TIME CHECK
    const [openH, openM] = shop.open_time.split(":").map(Number);
    const [closeH, closeM] = shop.closing_time.split(":").map(Number);

    const openTime = new Date();
    openTime.setHours(openH, openM, 0);

    const closeTime = new Date();
    closeTime.setHours(closeH, closeM, 0);

    return now >= openTime && now <= closeTime;
  };

  const formatDaysOpen = () => {
    if (!shop?.days_from || !shop?.days_to) return "Days not set";

    return shop.days_from === shop.days_to
      ? shop.days_from
      : `${shop.days_from} – ${shop.days_to}`;
  };

  const isDayOpen = (shop, dayIndex) => {
    const fromIndex = DAYS.indexOf(shop.days_from);
    const toIndex = DAYS.indexOf(shop.days_to);

    if (fromIndex === -1 || toIndex === -1) return false;

    return fromIndex <= toIndex
      ? dayIndex >= fromIndex && dayIndex <= toIndex
      : dayIndex >= fromIndex || dayIndex <= toIndex;
  };
  const getDayHoursLabel = (shop, dayIndex) => {
    if (!isDayOpen(shop, dayIndex)) return "Closed";

    if (
      shop.open_time === "00:00:00" &&
      shop.closing_time === "23:59:59"
    ) {
      return "Open 24 hours";
    }

    return `${formatTime(shop.open_time)} – ${formatTime(shop.closing_time)}`;
  };




  /* -----------------------------------------------------------
     UI STARTS HERE
  ----------------------------------------------------------- */

  return (
    <div className="bg-white text-gray-900">
      {/* HEADER */}
      <header className="border-b border-gray-200 bg-white w-full flex-shrink-0 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4"></div>
      </header>

      <main>
        {/* BANNER */}
        <div className="w-full h-48 md:h-64 lg:h-80 bg-gray-200">
          <img
            src="https://placehold.co/1920x320/a5f3fc/0ea5e9?text=Shop+Banner&font=inter"
            alt="Shop banner"
            className="w-full h-full object-cover"
          />
        </div>

        {/* SHOP HEADER */}
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative -mt-16 md:-mt-24">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between p-4 bg-white rounded-lg shadow-lg">

              {/* SHOP LOGO + NAME */}
              <div className="flex items-center">
                <div className="h-24 w-24 md:h-32 md:w-32 rounded-full border-4 border-white bg-gray-100 overflow-hidden">
                  <img
                    src="https://placehold.co/128x128/e0e7ff/4338ca?text=SHOP"
                    alt="Shop Logo"
                    className="h-full w-full object-contain p-4"
                  />
                </div>

                <div className="ml-4 mt-16 md:mt-0">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    {shop.name}
                  </h1>

                  <div className="flex items-center mt-1">
                    <span className="text-sm text-yellow-500">
                      {Array.from({ length: ratingCount }).map((_, i) => (
                        <span key={i}>★</span>
                      ))}
                    </span> 

                    <span className="text-sm text-gray-600 ml-2">
                      {shop.rating_average ?? 0} ({reviews.length} reviews)
                    </span>
                  </div>
                </div>
              </div>

              {/* BUTTONS */}
              <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0 md:mb-2">
              <Link
                to="/client-repair-request-modal"
                state={{ shop_id: shop?.id }}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Book Service
              </Link>

              {shop && (
                <Link
                  to="/chat"
                  state={{ shop }}     // ALWAYS send full shop object
                  className="px-5 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Chat
                </Link>
              )}

              </div>
            </div>

            {/* SHOP DETAILS */}
            <div className="relative mt-4 text-sm text-gray-700">

              {/* STATUS ROW */}
              <button
                onClick={() => setShowHours(!showHours)}
                className="flex items-center bg-white gap-3 text-left"
              >
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium
                    ${isShopOpenNow(shop)
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                    }`}
                >
                  {isShopOpenNow(shop) ? "Open now" : "Closed"}
                </span>

                <span className="text-gray-600">
                  {getDayHoursLabel(shop, new Date().getDay())}
                </span>

                <span className="text-gray-400 text-xs">
                  ▼
                </span>
              </button>

              {/* FLOATING HOURS MODAL */}
              {showHours && (
                <>
                  {/* BACKDROP */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowHours(false)}
                  />

                  {/* HOURS PANEL */}
                  <div
                    className="absolute z-50 mt-2 w-64
                              bg-white border border-gray-200 rounded-xl shadow-lg
                              p-4"
                  >
                    <div className="space-y-2">
                      {DAYS.map((day, index) => {
                        const isToday = index === new Date().getDay();
                        const label = getDayHoursLabel(shop, index);

                        return (
                          <div
                            key={day}
                            className={`grid grid-cols-[90px_auto] gap-4 text-sm
                              ${isToday ? "font-semibold text-gray-900" : "text-gray-600"}
                            `}
                          >
                            <span>{day}</span>
                            <span className={label === "Closed" ? "text-gray-400" : ""}>
                              {label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* ADDRESS */}
              <div className="mt-4 text-gray-600">
                📍 {addressParts || "Address not set"}
              </div>
            </div>


            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">

              {/* ---------- LEFT PANEL (2 columns) ---------- */}
              <div className="lg:col-span-2 space-y-8">

                {/* SERVICES */}
                <section>
                  <h2 className="text-2xl font-bold mb-4">Offered Repair Services</h2>

                  {loadingExtras && services.length === 0 ? (
                    <p>Loading services...</p>
                  ) : services.length === 0 ? (
                    <p className="text-gray-500">No services listed.</p>
                  ) : (
                    <div className="space-y-3">
                      {services.map((svc) => (
                        <details key={svc.id} className="border rounded-lg">
                          <summary className="p-4 cursor-pointer hover:bg-gray-50 font-medium">
                            {svc.name}{" "}
                            <span className="float-right">
                              {svc.base_price ? `₱${svc.base_price}` : ""}
                            </span>
                          </summary>
                          <div className="p-4 text-sm text-gray-600 bg-gray-50">
                            {svc.description || "No description provided."}
                          </div>
                        </details>
                      ))}
                    </div>
                  )}
                </section>

                {/* DOCUMENTS */}
                <section>
                  <h2 className="text-2xl font-bold mb-4">Verified Documents</h2>

                  {documents.length === 0 ? (
                    <p className="text-sm text-gray-500">No documents found.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {documents.map((doc) => (
                        <a
                          key={doc.id}
                          href={doc.file_path}
                          target="_blank"
                          rel="noreferrer"
                          className="p-4 border rounded-lg text-center hover:bg-gray-50"
                        >
                          <p className="font-medium">{doc.type || doc.file_name}</p>
                          <span className="text-xs text-green-600">
                            {doc.status || "Verified"}
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </section>

                {/* REVIEWS */}
                <section>
                  <h2 className="text-2xl font-bold mb-4">Customer Reviews</h2>

                  {reviews.length === 0 ? (
                    <p className="text-gray-500 text-sm">No reviews yet.</p>
                  ) : (
                    <div className="space-y-6">
                      {reviews.map((review) => (
                        <div key={review.id} className="border-b pb-6">
                          <div className="font-semibold">
                            {review.first_name
                              ? `${review.first_name} ${review.last_name || ""}`
                              : "Anonymous"}
                          </div>

                          <div className="text-yellow-500 text-sm">
                            {Array.from({ length: review.rating }).map((_, i) => (
                              <span key={i}>★</span>
                            ))}
                          </div>

                          <p className="text-sm mt-2 text-gray-700">{review.feedback}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

              </div>

              {/* ---------- RIGHT SIDEBAR ---------- */}
              <aside className="lg:col-span-1">
                <div className="sticky top-24">
                  <h2 className="text-2xl font-bold mb-4">Location</h2>

                  <div className="w-full h-80 bg-gray-200 rounded-lg overflow-hidden">
                    <img
                      src="https://placehold.co/600x400/e5e7eb/9ca3af?text=Map"
                      alt="Map placeholder"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </aside>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default ShopProfile;
