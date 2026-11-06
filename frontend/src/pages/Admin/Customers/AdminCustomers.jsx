import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import {
  Users,
  Search,
  RefreshCw,
  Eye,
  UserCheck,
  UserX,
  Trash2,
  UserRound,
  Mail,
  CalendarDays,
} from "lucide-react";

import "./AdminCustomers.css";

/* =========================================================
   API CONFIG
   Same base URL as the other admin pages.
   Vite:  VITE_API_URL in .env (e.g. http://localhost:5000/api)
   CRA:   use process.env.REACT_APP_API_URL instead.
========================================================= */

const API_BASE =
  import.meta.env.VITE_API_URL || "https://maamta.onrender.com/api";

const CUSTOMERS_URL = `${API_BASE}/admin/customers`;

const TOKEN_KEY = "mamta_admin_token";
const USER_KEY = "mamta_admin_user";

/* =========================================================
   HELPERS
========================================================= */

const isActive = (customer) => customer.active !== false;

const formatDate = (date) => {
  if (!date) {
    return "N/A";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }

  return parsed.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getNetworkMessage = (err, fallback) =>
  err.response?.data?.message ||
  (err.request && !err.response
    ? "Cannot reach the server. If it was idle, wait a minute and try again."
    : fallback);

/* =========================================================
   ADMIN CUSTOMERS
========================================================= */

const AdminCustomers = () => {
  const navigate = useNavigate();

  /* =======================================================
     STATE
  ======================================================= */

  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");

  /* =======================================================
     AUTH FAILURE
  ======================================================= */

  const handleAuthFailure = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    navigate("/admin");
  }, [navigate]);

  /* =======================================================
     FETCH CUSTOMERS (single source of truth)
     GET /api/admin/customers
     `isRefresh` shows the small refresh spinner instead of
     the full-page loader.
  ======================================================= */

const fetchCustomers = useCallback(
  async (isRefresh = false) => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        navigate("/admin");
        return;
      }

      const response = await axios.get(CUSTOMERS_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = response.data;

      setCustomers(
        Array.isArray(data?.customers)
          ? data.customers
          : Array.isArray(data)
          ? data
          : []
      );

      setError("");
    } catch (err) {
      console.error("FETCH CUSTOMERS ERROR:", err);

      const code = err.response?.status;

      if (code === 401 || code === 403) {
        handleAuthFailure();
        return;
      }

      setError(getNetworkMessage(err, "Failed to load customers."));
    } finally {
      setLoading(false);

      if (isRefresh) {
        setRefreshing(false);
      }
    }
  },
  [navigate, handleAuthFailure]
);

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
  let cancelled = false;

  const loadCustomers = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        navigate("/admin");
        return;
      }

      const response = await axios.get(CUSTOMERS_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (cancelled) return;

      const data = response.data;

      setCustomers(
        Array.isArray(data?.customers)
          ? data.customers
          : Array.isArray(data)
          ? data
          : []
      );

      setError("");
    } catch (err) {
      if (cancelled) return;

      console.error("FETCH CUSTOMERS ERROR:", err);

      const code = err.response?.status;

      if (code === 401 || code === 403) {
        handleAuthFailure();
        return;
      }

      setError(getNetworkMessage(err, "Failed to load customers."));
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  };

  loadCustomers();

  return () => {
    cancelled = true;
  };
}, [navigate, handleAuthFailure]);

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredCustomers = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    if (!searchText) {
      return customers;
    }

    return customers.filter((customer) => {
      const name = customer.name?.toLowerCase() || "";
      const email = customer.email?.toLowerCase() || "";

      return name.includes(searchText) || email.includes(searchText);
    });
  }, [customers, search]);

  /* =======================================================
     STATISTICS
  ======================================================= */

  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter(isActive).length;

    return { total, active, inactive: total - active };
  }, [customers]);

  /* =======================================================
     UPDATE STATUS
     PATCH /api/admin/customers/:id/status
  ======================================================= */

  const handleStatusChange = async (customer) => {
    if (actionLoading) {
      return;
    }

    const nextActive = !isActive(customer);

    try {
      setActionLoading(customer._id);

      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        navigate("/admin");
        return;
      }

      const response = await axios.patch(
        `${CUSTOMERS_URL}/${customer._id}/status`,
        { active: nextActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      /* Use the server's copy when returned; otherwise apply the
         change locally, since the request itself succeeded. */
      const updatedCustomer = response.data?.customer || {
        ...customer,
        active: nextActive,
      };

      setCustomers((current) =>
        current.map((item) =>
          item._id === customer._id ? { ...item, ...updatedCustomer } : item
        )
      );
    } catch (err) {
      console.error("UPDATE CUSTOMER STATUS ERROR:", err);

      const code = err.response?.status;

      if (code === 401 || code === 403) {
        handleAuthFailure();
        return;
      }

      alert(getNetworkMessage(err, "Unable to update customer status."));
    } finally {
      setActionLoading("");
    }
  };

  /* =======================================================
     DELETE CUSTOMER
     DELETE /api/admin/customers/:id
  ======================================================= */

  const handleDeleteCustomer = async (customer) => {
    if (actionLoading) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete ${
        customer.name || "this customer"
      }? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(customer._id);

      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        navigate("/admin");
        return;
      }

      await axios.delete(`${CUSTOMERS_URL}/${customer._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCustomers((current) =>
        current.filter((item) => item._id !== customer._id)
      );
    } catch (err) {
      console.error("DELETE CUSTOMER ERROR:", err);

      const code = err.response?.status;

      if (code === 401 || code === 403) {
        handleAuthFailure();
        return;
      }

      alert(getNetworkMessage(err, "Unable to delete customer."));
    } finally {
      setActionLoading("");
    }
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="admin-customers-page">
        <div className="customers-loading">
          <div className="customers-loader"></div>
          <p>Loading customers...</p>
        </div>
      </div>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="admin-customers-page">
      {/* HEADER */}

      <div className="customers-page-header">
        <div className="customers-heading">
          <div className="customers-heading-icon">
            <Users size={23} />
          </div>

          <div>
            <span>MAMTA ADMIN</span>
            <h1>Customers</h1>
            <p>Manage your registered MAMTA customers.</p>
          </div>
        </div>

        <button
          type="button"
          className="customers-refresh-btn"
          onClick={() => {
  setRefreshing(true);
  fetchCustomers(true);
}}
          disabled={refreshing}
        >
          <RefreshCw size={17} className={refreshing ? "refresh-spinning" : ""} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* STATISTICS */}

      <div className="customers-stats">
        <div className="customer-stat-card">
          <div className="customer-stat-icon total">
            <Users size={20} />
          </div>

          <div>
            <span>Total Customers</span>
            <strong>{stats.total}</strong>
          </div>
        </div>

        <div className="customer-stat-card">
          <div className="customer-stat-icon active">
            <UserCheck size={20} />
          </div>

          <div>
            <span>Active Customers</span>
            <strong>{stats.active}</strong>
          </div>
        </div>

        <div className="customer-stat-card">
          <div className="customer-stat-icon inactive">
            <UserX size={20} />
          </div>

          <div>
            <span>Inactive Customers</span>
            <strong>{stats.inactive}</strong>
          </div>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="customers-error" role="alert">
          {error}
        </div>
      )}

      {/* TOOLBAR */}

      <div className="customers-toolbar">
        <div className="customers-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search by customer name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="customers-count">
          {filteredCustomers.length}{" "}
          {filteredCustomers.length === 1 ? "Customer" : "Customers"}
        </div>
      </div>

      {/* CONTENT */}

      {filteredCustomers.length === 0 ? (
        <div className="customers-empty">
          <div className="customers-empty-icon">
            <UserRound size={34} />
          </div>

          <h3>{search ? "No customers found" : "No customers yet"}</h3>

          <p>
            {search
              ? "Try searching with a different name or email."
              : "Registered customers will appear here."}
          </p>
        </div>
      ) : (
        <div className="customers-table-card">
          <div className="customers-table-wrapper">
            <table className="customers-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredCustomers.map((customer) => {
                  const active = isActive(customer);
                  const busy = actionLoading === customer._id;

                  return (
                    <tr key={customer._id}>
                      {/* CUSTOMER */}

                      <td>
                        <div className="customer-profile">
                          <div className="customer-avatar">
                            {customer.name?.charAt(0)?.toUpperCase() || "C"}
                          </div>

                          <div>
                            <strong>
                              {customer.name || "Unnamed Customer"}
                            </strong>
                            <span>Customer</span>
                          </div>
                        </div>
                      </td>

                      {/* EMAIL */}

                      <td>
                        <div className="customer-email">
                          <Mail size={15} />
                          <span>{customer.email || "-"}</span>
                        </div>
                      </td>

                      {/* JOINED */}

                      <td>
                        <div className="customer-date">
                          <CalendarDays size={15} />
                          <span>{formatDate(customer.createdAt)}</span>
                        </div>
                      </td>

                      {/* STATUS */}

                      <td>
                        <span
                          className={`customer-status ${
                            active ? "active" : "inactive"
                          }`}
                        >
                          {active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* ACTIONS */}

                      <td>
                        <div className="customer-actions">
                          <button
                            type="button"
                            className="customer-view-btn"
                            title="View Customer"
                            aria-label={`View ${customer.name || "customer"}`}
                            onClick={() =>
                              navigate(`/admin/customers/${customer._id}`)
                            }
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            type="button"
                            className={`customer-status-btn ${
                              active ? "deactivate" : "activate"
                            }`}
                            title={
                              active
                                ? "Deactivate Customer"
                                : "Activate Customer"
                            }
                            aria-label={
                              active
                                ? "Deactivate customer"
                                : "Activate customer"
                            }
                            disabled={busy}
                            onClick={() => handleStatusChange(customer)}
                          >
                            {active ? (
                              <UserX size={16} />
                            ) : (
                              <UserCheck size={16} />
                            )}
                          </button>

                          <button
                            type="button"
                            className="customer-delete-btn"
                            title="Delete Customer"
                            aria-label="Delete customer"
                            disabled={busy}
                            onClick={() => handleDeleteCustomer(customer)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCustomers;