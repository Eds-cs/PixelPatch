import { Link, useParams, useLocation } from "react-router-dom";
import { ROUTES } from "../constants/routes";
import React, { useEffect, useState } from "react";
import axios from "axios";

const ShopProfile = () => {
  const { id } = useParams();
  const location = useLocation();

  // Fallback if navigating from Messages.jsx
  const shopFromState = location.state?.shop || null;

  const [shop, setShop] = useState(shopFromState);
  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch shop if user reloads page or enters URL manually
  useEffect(() => {
    if (shop) return;
    if (!id) return;

    setLoading(true);

    axios
      .get(`http://72.62.248.151/api/shops/${id}`)
      .then((res) => setShop(res.data.shop))
      .catch((err) => console.error("Shop fetch error:", err))
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch services, reviews, documents
  useEffect(() => {
    if (!shop?.id) return;

    axios
      .get(`http://72.62.248.151/api/shops/${shop.id}/services`)
      .then((res) => setServices(res.data.services))
      .catch(() => setServices([]));

    axios
      .get(`http://72.62.248.151/api/shops/${shop.id}/reviews`)
      .then((res) => setReviews(res.data.reviews))
      .catch(() => setReviews([]));

    axios
      .get(`http://72.62.248.151/api/shops/${shop.id}/documents`)
      .then((res) => setDocuments(res.data.documents))
      .catch(() => setDocuments([]));
  }, [shop]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!shop) return <div className="p-6">Shop not found.</div>;

  return (
    <div className="bg-white text-gray-900">
      <header className="border-b border-gray-200 bg-white w-full flex-shrink-0 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"></div>
      </header>

      <main>
        {/* Banner */}
        <div className="w-full h-48 md:h-64 lg:h-80 bg-gray-200">
          <img
            src="https://placehold.co/1920x320/a5f3fc/0ea5e9?text=Shop+Banner&font=inter"
            alt="Shop banner"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Shop Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative -mt-16 md:-mt-24">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between p-4 bg-white rounded-lg shadow-lg">
              
              <div className="flex items-center">
                
                {/* Logo (placeholder only, no DB needed) */}
                <div className="flex-shrink-0 h-24 w-24 md:h-32 md:w-32 rounded-full border-4 border-white bg-gray-100 overflow-hidden">
                  <img
                    src="https://placehold.co/128x128/e0e7ff/4338ca?text=SHOP&font=inter"
                    alt="Shop Logo"
                    className="h-full w-full object-contain p-4"
                  />
                </div>

                <div className="ml-4 mt-16 md:mt-0">

                  {/* Real shop name */}
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    {shop.name}
                  </h1>

                  {/* Rating */}
                  <div className="flex items-center mt-1">
                    <span className="text-sm text-yellow-500">
                      {Array.from({ length: Math.round(shop.rating_average ?? 0) }).map((_, i) => (
                        <span key={i}>★</span>
                      ))}
                    </span>
                    <span className="text-sm text-gray-600 ml-2">
                      {shop.rating_average ?? 0}.0 ({reviews.length} reviews)
                    </span>
                  </div>

                  {/* Address */}
                  <p className="text-sm text-gray-700 mt-1">
                    📍 {shop.street || ""} {shop.barangay || ""}{" "}
                    {shop.province || shop.region || ""}
                  </p>

                  {/* Phone */}
                  {shop.phone_number && (
                    <p className="text-sm text-gray-700">📞 {shop.phone_number}</p>
                  )}

                  {/* Email */}
                  {shop.email && (
                    <p className="text-sm text-gray-700">✉️ {shop.email}</p>
                  )}

                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0 md:mb-2">
                <Link
                  to={ROUTES.CLIENT_REPAIR_REQUEST_MODAL}
                  state={{ shop }}
                  className="flex items-center justify-center px-5 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  Book Service
                </Link>

                <Link
                  to={ROUTES.CLIENT_MESSAGES}
                  state={{ shop }}
                  className="flex items-center justify-center px-5 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Chat
                </Link>
              </div>

            </div>
          </div>
        </div>


        {/* Services */}
        <div className="max-w-7xl mx-auto px-4 mt-10">
          <h2 className="text-xl font-semibold mb-3">Services Offered</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.length === 0 && (
              <p className="text-gray-500 text-sm">No services listed.</p>
            )}

            {services.map((service) => (
              <div
                key={service.id}
                className="p-4 bg-gray-100 rounded-lg shadow-sm flex justify-between"
              >
                <div>
                  <h3 className="font-semibold">{service.name}</h3>
                  <p className="text-sm text-gray-600">{service.description}</p>
                </div>
                <p className="font-semibold">
                  {service.base_price ? `₱${service.base_price}` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews */}
        <div className="max-w-7xl mx-auto px-4 mt-10 mb-10">
          <h2 className="text-xl font-semibold mb-3">Customer Reviews</h2>

          {reviews.length === 0 && (
            <p className="text-gray-500 text-sm">No reviews yet.</p>
          )}

          {reviews.map((review) => (
            <div
              key={review.id}
              className="p-4 bg-white border rounded-lg shadow-sm mb-3"
            >
              <div className="font-semibold">
                {review.first_name
                  ? `${review.first_name} ${review.last_name}`
                  : "Anonymous"}
              </div>
              <div className="text-yellow-500 text-sm">
                {Array.from({ length: review.rating }).map((_, i) => (
                  <span key={i}>★</span>
                ))}
              </div>
              <p className="text-sm text-gray-700 mt-2">{review.feedback}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default ShopProfile;
