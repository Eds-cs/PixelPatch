import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { ROUTES } from "../constants/routes";

const API_BASE = import.meta.env.VITE_API_URL;

const Services = () => {
  const [shops, setShops] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // UX STATE
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // SHOP FILTERS
  const [minShopRating, setMinShopRating] = useState("all");

  // SERVICE FILTERS
  const [serviceCategory, setServiceCategory] = useState("all");

  useEffect(() => {
    (async () => {
      try {
        const [shopsRes, servicesRes] = await Promise.all([
          axios.get(`${API_BASE}/api/public/shops`),
          axios.get(`${API_BASE}/api/public/services`)
        ]);

        setShops(Array.isArray(shopsRes.data.shops) ? shopsRes.data.shops : []);
        setServices(Array.isArray(servicesRes.data.services) ? servicesRes.data.services : []);
      } catch (err) {
        console.error("❌ SERVICES LOAD ERROR:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  //=========================
  // HELPERS
  //=========================
  const DAYS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const isShopOpenNow = (shop) => {
    if (
      !shop?.open_time ||
      !shop?.closing_time ||
      !shop?.days_from ||
      !shop?.days_to
    ) {
      return false;
    }

    const now = new Date();
    const currentDayIndex = now.getDay();

    const fromIndex = DAYS.indexOf(shop.days_from);
    const toIndex = DAYS.indexOf(shop.days_to);

    if (fromIndex === -1 || toIndex === -1) return false;

    // ✅ Day check (handles wrap-around)
    const isDayOpen =
      fromIndex <= toIndex
        ? currentDayIndex >= fromIndex && currentDayIndex <= toIndex
        : currentDayIndex >= fromIndex || currentDayIndex <= toIndex;

    if (!isDayOpen) return false;

    // ✅ Time check
    const [openH, openM] = shop.open_time.split(":").map(Number);
    const [closeH, closeM] = shop.closing_time.split(":").map(Number);

    const openTime = new Date();
    openTime.setHours(openH, openM, 0);

    const closeTime = new Date();
    closeTime.setHours(closeH, closeM, 0);

    return now >= openTime && now <= closeTime;
  };

  const formatTime = (time) => {
    if (!time) return "";
    const [h, m] = time.split(":");
    const hour = Number(h);
    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${suffix}`;
  };


  if (loading) {
    return <div className="p-10 text-center text-gray-500">Loading…</div>;
  }

  /* =========================
     FILTERED DATA
  ========================= */

  const filteredShops = shops.filter((shop) => {
    const matchesSearch =
      shop.name.toLowerCase().includes(search.toLowerCase());

    const matchesRating =
      minShopRating === "all" ||
      Number(shop.rating_average) >= Number(minShopRating);

    return matchesSearch && matchesRating;
  });

  const filteredServices = services.filter((service) => {
    const matchesSearch =
      service.name.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      serviceCategory === "all" ||
      service.category === serviceCategory;

    return matchesSearch && matchesCategory;
  });

  const resetFilters = () => {
    setSearch("");
    setMinShopRating("all");
    setServiceCategory("all");
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-14 space-y-14">

        {/* =========================
            HEADER + SEARCH
        ========================= */}
        <div>
          <h2 className="text-3xl font-bold">Explore Repair Services</h2>
          <p className="text-gray-600 mt-1">
            Find trusted shops and popular repair services
          </p>

          <div className="mt-6 flex flex-col gap-4">
            <input
              type="text"
              placeholder="Search shops or services…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-5 py-3 text-sm
                         focus:border-blue-500 focus:ring-blue-500"
            />

            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-sm bg-white font-medium text-blue-600"
              >
                {showFilters ? "Hide filters" : "Show filters"}
              </button>

              {(search || minShopRating !== "all" || serviceCategory !== "all") && (
                <button
                  onClick={resetFilters}
                  className="text-sm bg-white font-medium text-red-600"
                >
                  Clear all filters
                </button>
              )}
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* SHOP RATING */}
                <select
                  value={minShopRating}
                  onChange={(e) => setMinShopRating(e.target.value)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
                >
                  <option value="all">All shop ratings</option>
                  <option value="4.5">4.5 ★ & up</option>
                  <option value="4">4 ★ & up</option>
                  <option value="3">3 ★ & up</option>
                </select>

                {/* SERVICE CATEGORY */}
                <select
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
                >
                  <option value="all">All service categories</option>
                  <option value="SMARTPHONE">Smartphone</option>
                  <option value="LAPTOP">Laptop</option>
                  <option value="DESKTOP">Desktop</option>
                  <option value="TABLET">Tablet</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* =========================
            TOP REPAIR SHOPS
        ========================= */}
        <section>
          <h3 className="text-2xl font-bold mb-2">Top Repair Shops</h3>
          <p className="text-sm text-gray-500 mb-6">
            Showing {filteredShops.length} shop{filteredShops.length !== 1 && "s"}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredShops.map((shop) => {
              const openNow = isShopOpenNow(shop); // ✅ FIXED

              return (
                <Link
                  key={`shop-${shop.id}`}
                  to={ROUTES.SHOP_DETAIL(shop.id)}
                  className="bg-white rounded-xl border border-gray-200 p-5
                            shadow-sm transition hover:shadow-md hover:border-blue-500"
                >
                  {/* HEADER */}
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-semibold text-lg leading-tight">
                      {shop.name}
                    </h4>

                    <span
                      className={`text-xs font-medium px-3 py-1 rounded-full shrink-0
                        ${openNow
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                        }`}
                    >
                      {openNow ? "Open now" : "Closed"}
                    </span>
                  </div>

                  {/* RATING */}
                  <p className="text-yellow-500 text-sm mt-1">
                    ★ {shop.rating_average}
                  </p>

                  {/* HOURS */}
                  <p className="text-xs text-gray-500 mt-2">
                    🕒 Today: {formatTime(shop.open_time)} – {formatTime(shop.closing_time)}
                  </p>

                  {/* ADDRESS */}
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                    {shop.street}, {shop.barangay}, {shop.province}
                  </p>

                  {/* VERIFIED */}
                  {shop.is_verified && (
                    <span className="inline-flex items-center gap-1 mt-3
                                    text-xs font-medium bg-green-100 text-green-700
                                    px-3 py-1 rounded-full w-fit">
                      ✔ Verified Shop
                    </span>
                  )}
                </Link>
              );
            })}

          </div>
        </section>


        {/* =========================
            POPULAR SERVICES
        ========================= */}
        <section>
          <h3 className="text-2xl font-bold mb-2">Popular Repair Services</h3>
          <p className="text-sm text-gray-500 mb-6">
            Showing {filteredServices.length} service{filteredServices.length !== 1 && "s"}
          </p>

          {filteredServices.length === 0 ? (
            <p className="text-sm text-gray-500">No services match your filters.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredServices.map((service) => (
                <Link
                  key={service.service_key}
                  to={`/services/${service.service_key}`}
                  className="group bg-white rounded-xl border border-gray-200 p-5
                             shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="font-semibold text-lg leading-snug text-gray-900">
                      {service.name}
                    </h4>

                    <span
                      className="shrink-0 text-xs font-medium
                                bg-blue-100 text-blue-700
                                px-3 py-1 rounded-full"
                    >
                      {service.category}
                    </span>
                  </div>
                  <div className="mt-3 text-sm text-gray-600 space-y-1">
                    <p>
                      Offered by <strong>{service.shop_count}</strong> shops
                    </p>

                    <p className="text-yellow-500 font-medium">
                      ★ {service.avg_shop_rating}
                    </p>
                  </div>

                  <div className="mt-4">
                    <p className="text-lg font-bold">
                      ₱{service.min_price} – ₱{service.max_price}
                    </p>
                    <p className="text-xs text-gray-500">
                      Price varies per shop
                    </p>
                  </div>

                  <div className="mt-5">
                    <span className="block text-center bg-blue-600 text-white
                                     rounded-lg py-2 text-sm font-medium
                                     group-hover:bg-blue-700 transition">
                      View service →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
};

export default Services;