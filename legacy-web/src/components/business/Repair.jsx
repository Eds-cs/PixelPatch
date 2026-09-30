  // src/components/business/Repair.jsx
  import { useState, useEffect, useMemo } from "react";
  import { Link } from "react-router-dom";
  import axios from "axios";
  import DataTable from "react-data-table-component";
  import { ROUTES } from "../../constants/routes";
  import { RejectionModal } from "./index";

  const API_BASE = import.meta.env.VITE_API_URL || "http://72.62.248.151";

  export default function Repair() {
    const [repairs, setRepairs] = useState([]);
    const [shopId, setShopId] = useState(localStorage.getItem("shop_id") || null);
    const [loading, setLoading] = useState(true);

    const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState(null);

    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");


    // ---------------------------------------------
    // Fetch shop ID
    // ---------------------------------------------
    const fetchShopId = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await axios.get(
          `${API_BASE}/api/my-shop`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        if (res.data.success) {
          setShopId(res.data.shopId);
          localStorage.setItem("shop_id", res.data.shopId);
        }
      } catch (err) {
        console.error("Error fetching shop:", err);
      }
    };


    // ---------------------------------------------
    // Fetch repairs
    // ---------------------------------------------
    const fetchRepairs = async () => {
      if (!shopId) return;

      try {
        setLoading(true);

        const token = localStorage.getItem("token");
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        const res = await axios.get(`${API_BASE}/api/business/repairs/${shopId}`);

        if (res.data.success) {
          // Ensure services is a readable string
          const formatted = res.data.repairs.map((r) => ({
            ...r,
            servicesText: Array.isArray(r.services)
              ? r.services.join(", ")
              : "No services",
          }));

          setRepairs(formatted);
        }
      } catch (err) {
        console.error("Error fetching repairs:", err);
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      if (!shopId) fetchShopId();
    }, []);

    useEffect(() => {
      if (shopId) fetchRepairs();
    }, [shopId]);

    // ---------------------------------------------
    // Status badge
    // ---------------------------------------------
    const StatusBadge = ({ status }) => {
      const s = status?.toLowerCase();
      const style = {
        pending: "bg-yellow-100 text-yellow-800",
        rejected: "bg-red-100 text-red-800",
        accepted: "bg-blue-100 text-blue-800",
        "in-progress": "bg-orange-100 text-orange-800",
        done: "bg-green-100 text-green-800",
        completed: "bg-gray-100 text-gray-800",
      };

      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            style[s] || "bg-gray-100 text-gray-800"
          }`}
        >
          {status}
        </span>
      );
    };

    // ---------------------------------------------
    // Table columns
    // ---------------------------------------------
    const columns = useMemo(
          () => [
            {
              name: "Client",
              selector: (row) => row.client,
              sortable: true,
            },
            {
              name: "Device",
              selector: (row) => row.deviceType,
              sortable: true,
            },
            {
              name: "Services",
              selector: (row) =>
                row.services && row.services.trim() !== ""
                  ? row.services
                  : "No services",
              sortable: true,
                  },
            {
              name: "Status",
              selector: (row) => row.decisionStatus,
              cell: (row) => <StatusBadge status={row.decisionStatus} />,
              sortable: true,
            },
            {
              name: "Actions",
              width: "200px",
              cell: (row) => {
                const id = row.id.toString();
                const viewPath = ROUTES.BUSINESS.REPAIR_DETAIL.replace(":id", id);
                const status = row.decisionStatus?.toLowerCase();
                const isDisabled = status === "rejected" || status === "accepted";

                return (
                  <div className="flex items-center gap-3">   {/* ALIGN CENTER FIX */}
                    <Link
                      to={viewPath}
                      className="text-blue-600 hover:text-blue-800 font-medium py-1"  // Added py-1
                    >
                      View
                    </Link>

                    <button
                      disabled={isDisabled}
                      onClick={() => handleReject(id)}
                      className={`py-1 font-medium bg-white
                        ${
                          isDisabled
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-red-600 hover:text-red-800"
                        }
                      `}
                    >
                      Reject
                    </button>
                  </div>
                );
              }

            },
          ],
          []
        );

        const filteredRepairs = useMemo(() => {
          return repairs.filter((r) => {
            const matchesSearch =
              r.client?.toLowerCase().includes(searchText.toLowerCase()) ||
              r.deviceType?.toLowerCase().includes(searchText.toLowerCase()) ||
              r.services?.toLowerCase().includes(searchText.toLowerCase());

            const matchesStatus =
              statusFilter === "ALL" ||
              r.decisionStatus?.toUpperCase() === statusFilter;

            return matchesSearch && matchesStatus;
          });
    }, [repairs, searchText, statusFilter]);


    const handleReject = (id) => {
      setSelectedRequestId(id);
      setIsRejectionModalOpen(true);
    };

    return (
      <main className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Repair Requests</h1>


      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        {/* Search */}
        <input
          type="text"
          placeholder="Search client, device, or service..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-full sm:w-80 rounded-lg border border-gray-300 px-3 py-2 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

        

        <DataTable
          columns={columns}
          data={filteredRepairs}
          progressPending={loading}
          pagination
          highlightOnHover
          striped
          responsive
          customStyles={{
            rows: { style: { minHeight: "60px" } },
          }}
        />

        <RejectionModal 
          isOpen={isRejectionModalOpen}
          onClose={() => setIsRejectionModalOpen(false)}
          requestId={selectedRequestId}
          onSubmit={fetchRepairs}
        />
      </main>
    );
  }
