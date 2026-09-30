import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL;

const statusBadge = (status) => {
  switch (status) {
    case "OPEN":
      return "bg-red-100 text-red-700";
    case "SHOP_PROPOSED":
      return "bg-yellow-100 text-yellow-700";
    case "RESOLVED":
      return "bg-green-100 text-green-700";
    case "REJECTED":
      return "bg-gray-200 text-gray-700";
    default:
      return "bg-gray-100 text-gray-600";
  }
};

const BusinessDisputes = () => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // DataTable states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState("DESC");

  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDisputes = async () => {
      try {
        const res = await axios.get(
          `${API_BASE}/api/disputes/shop`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setDisputes(res.data.disputes || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load disputes");
      } finally {
        setLoading(false);
      }
    };

    fetchDisputes();
  }, []);

  const filteredDisputes = useMemo(() => {
    let data = [...disputes];

    // search
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(d =>
        `${d.first_name} ${d.last_name}`.toLowerCase().includes(q) ||
        String(d.request_id).includes(q)
      );
    }

    // status filter
    if (statusFilter !== "ALL") {
      data = data.filter(d => d.status === statusFilter);
    }

    // sort
    data.sort((a, b) => {
      const da = new Date(a.created_at);
      const db = new Date(b.created_at);
      return sortOrder === "DESC" ? db - da : da - db;
    });

    return data;
  }, [disputes, search, statusFilter, sortOrder]);

  if (loading) {
    return <div className="p-6 text-gray-500">Loading disputes…</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Disputes</h1>

        {/* Controls */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search client or request #"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="SHOP_PROPOSED">Shop Proposed</option>
            <option value="RESOLVED">Resolved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            <option value="DESC">Newest first</option>
            <option value="ASC">Oldest first</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {filteredDisputes.length === 0 ? (
        <div className="bg-gray-50 border rounded-lg p-6 text-sm text-gray-600">
          No disputes found.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr className="text-gray-600">
                <th className="px-5 py-3 text-left font-medium">Client</th>
                <th className="px-5 py-3 text-left font-medium">Request</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-left font-medium">Created</th>
                <th className="px-5 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDisputes.map((d) => (
                <tr
                  key={d.id}
                  className="border-b last:border-b-0 hover:bg-gray-50 transition"
                >
                  <td className="px-5 py-4 font-medium">
                    {d.first_name} {d.last_name}
                  </td>

                  <td className="px-5 py-4 text-gray-600">
                    #{d.request_id}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusBadge(d.status)}`}
                    >
                      {d.status.replace("_", " ")}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-gray-600">
                    {new Date(d.created_at).toLocaleDateString()}
                  </td>

                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => navigate(`/business/disputes/${d.id}`)}
                      className="bg-white text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default BusinessDisputes;
