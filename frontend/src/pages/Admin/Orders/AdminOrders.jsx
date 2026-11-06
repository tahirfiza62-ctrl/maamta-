import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  RefreshCw,
  ShoppingBag,
  Eye,
  Filter,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./AdminOrders.css";

/* =========================================================
   API CONFIG
   Same base URL as the product pages.
   Vite:  VITE_API_URL in .env (e.g. http://localhost:5000/api)
   CRA:   use process.env.REACT_APP_API_URL instead.
========================================================= */

const API_BASE =
  import.meta.env.VITE_API_URL || "https://maamta.onrender.com/api";

const ORDERS_URL = `${API_BASE}/admin/orders`;

const TOKEN_KEY = "mamta_admin_token";
const USER_KEY = "mamta_admin_user";

const STATUS_OPTIONS = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

/* =========================================================
   HELPERS (pure, defined once outside the component)
========================================================= */

const getOrderId = (order) => order._id || order.id || "";

const getCustomerName = (order) =>
  order.customer?.name || order.name || order.customerName || "Guest Customer";

const getCustomerEmail = (order) =>
  order.customer?.email || order.email || "—";

const getTotal = (order) =>
  Number(order.total || order.grandTotal || order.amount || 0);

const getPaymentMethod = (order) =>
  order.paymentMethod || order.payment?.method || "—";

/* Backend stores the current status in `orderStatus` */
const getStatus = (order) => order.orderStatus || order.status || "Pending";

const getDate = (order) => {
  const date = order.createdAt || order.date || order.created_on;

  if (!date) {
    return "—";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getItemCount = (order) => {
  if (!Array.isArray(order.items)) {
    return 0;
  }

  return order.items.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );
};

const getOrderColors = (order) => {
  if (!Array.isArray(order.items)) {
    return [];
  }

  return order.items
    .map((item) => (item.color ? String(item.color) : null))
    .filter(Boolean);
};

const getStatusClass = (status) =>
  String(status).toLowerCase().replace(/\s+/g, "-");

/* Accepts either an array or { orders: [] } */
const extractOrders = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.orders)) {
    return data.orders;
  }

  return [];
};

/* =========================================================
   ADMIN ORDERS
========================================================= */

const AdminOrders = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState(null);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  /* =========================================================
     AUTH FAILURE
     Clears the session and redirects. Returns true if the
     response was an auth failure.
  ========================================================= */

  const handleAuthFailure = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    navigate("/admin");
  }, [navigate]);

  /* =========================================================
     FETCH ORDERS (single source of truth)
     GET /api/admin/orders
     `isRefresh` shows the small refresh spinner instead of the
     full-page loader.
  ========================================================= */

const fetchOrders = useCallback(
  async (isRefresh = false) => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        navigate("/admin");
        return;
      }

      const response = await fetch(ORDERS_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthFailure();
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to load orders.");
      }

      const data = await response.json();

      setOrders(extractOrders(data));
      setError("");
    } catch (err) {
      console.error("ADMIN ORDERS ERROR:", err);

      setError(
        err instanceof TypeError
          ? "Cannot reach the server. If it was idle, wait a minute and press Refresh."
          : err.message || "Unable to load orders."
      );
    } finally {
      setLoading(false);

      if (isRefresh) {
        setRefreshing(false);
      }
    }
  },
  [navigate, handleAuthFailure]
);

  /* =========================================================
     INITIAL LOAD
  ========================================================= */
useEffect(() => {
  let cancelled = false;

  const loadOrders = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        navigate("/admin");
        return;
      }

      const response = await fetch(ORDERS_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (cancelled) return;

      if (response.status === 401 || response.status === 403) {
        handleAuthFailure();
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to load orders.");
      }

      const data = await response.json();

      if (cancelled) return;

      setOrders(extractOrders(data));
      setError("");
    } catch (err) {
      if (cancelled) return;

      console.error("ADMIN ORDERS ERROR:", err);

      setError(
        err instanceof TypeError
          ? "Cannot reach the server. If it was idle, wait a minute and press Refresh."
          : err.message || "Unable to load orders."
      );
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  };

  loadOrders();

  return () => {
    cancelled = true;
  };
}, [navigate, handleAuthFailure]);

  /* =========================================================
     DELETE ORDER
     DELETE /api/admin/orders/:id
  ========================================================= */

  const handleDeleteOrder = async (orderId) => {
    if (!orderId) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this order? This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingOrderId(orderId);

      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        navigate("/admin");
        return;
      }

      const response = await fetch(`${ORDERS_URL}/${orderId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401 || response.status === 403) {
        handleAuthFailure();
        return;
      }

      if (!response.ok) {
        let errorMessage = "Unable to delete order.";

        try {
          const errorData = await response.json();
          errorMessage = errorData?.message || errorMessage;
        } catch {
          // Ignore invalid JSON response
        }

        throw new Error(errorMessage);
      }

      setOrders((currentOrders) =>
        currentOrders.filter(
          (order) => String(getOrderId(order)) !== String(orderId)
        )
      );

      alert("Order deleted successfully.");
    } catch (err) {
      console.error("DELETE ORDER ERROR:", err);

      alert(
        err instanceof TypeError
          ? "Cannot reach the server. Please try again."
          : err.message || "Unable to delete order."
      );
    } finally {
      setDeletingOrderId(null);
    }
  };

  /* =========================================================
     FILTER ORDERS
  ========================================================= */

  const filteredOrders = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !searchValue ||
        String(getCustomerName(order)).toLowerCase().includes(searchValue) ||
        String(getCustomerEmail(order)).toLowerCase().includes(searchValue) ||
        String(getOrderId(order)).toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "All" || getStatus(order) === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  /* =========================================================
     OPEN ORDER
  ========================================================= */

  const handleViewOrder = (orderId) => {
    if (!orderId) {
      return;
    }

    navigate(`/admin/orders/${orderId}`);
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="admin-orders-page">
        <div className="admin-orders-loading">
          <RefreshCw size={28} className="admin-orders-spinner" />
          <p>Loading orders...</p>
        </div>
      </div>
    );
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className="admin-orders-page">
      {/* HEADER */}

      <div className="admin-orders-header">
        <div>
          <span className="admin-orders-eyebrow">MAMTA ADMIN</span>

          <h1>Orders</h1>

          <p>Manage and review customer orders.</p>
        </div>

        <button
          type="button"
          className="admin-refresh-button"
          onClick={() => fetchOrders(true)}
          disabled={refreshing}
        >
          <RefreshCw
            size={17}
            className={refreshing ? "admin-orders-spinner" : ""}
          />

          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* FILTER BAR */}

      <div className="admin-orders-toolbar">
        <div className="admin-orders-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search orders, customer name or email..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="admin-orders-filter">
          <Filter size={17} />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter by status"
          >
            <option value="All">All Status</option>

            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="admin-orders-error" role="alert">
          {error}
        </div>
      )}

      {/* ORDER COUNT */}

      <div className="admin-orders-count">
        Showing <strong>{filteredOrders.length}</strong> of{" "}
        <strong>{orders.length}</strong> orders
      </div>

      {/* TABLE */}

      <div className="admin-orders-table-wrapper">
        {filteredOrders.length === 0 ? (
          <div className="admin-orders-empty">
            <div className="admin-orders-empty-icon">
              <ShoppingBag size={28} />
            </div>

            <h2>No orders found</h2>

            <p>
              {orders.length === 0
                ? "There are no orders yet."
                : "There are no orders matching your current filters."}
            </p>
          </div>
        ) : (
          <table className="admin-orders-table">
            <thead>
              <tr>
                <th>ORDER</th>
                <th>CUSTOMER</th>
                <th>ITEMS</th>
                <th>TOTAL</th>
                <th>PAYMENT</th>
                <th>STATUS</th>
                <th>DATE</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((order, index) => {
                const orderId = getOrderId(order);
                const colors = getOrderColors(order);
                const itemCount = getItemCount(order);
                const status = getStatus(order);
                const isDeleting =
                  deletingOrderId !== null &&
                  String(deletingOrderId) === String(orderId);

                return (
                  <tr key={orderId || index}>
                    {/* ORDER */}

                    <td>
                      <div className="admin-order-id">
                        <span>#</span>
                        {String(orderId).slice(-8)}
                      </div>
                    </td>

                    {/* CUSTOMER */}

                    <td>
                      <div className="admin-order-customer">
                        <strong>{getCustomerName(order)}</strong>
                        <span>{getCustomerEmail(order)}</span>
                      </div>
                    </td>

                    {/* ITEMS */}

                    <td>
                      <div className="admin-order-items-cell">
                        <strong>
                          {itemCount} {itemCount === 1 ? "item" : "items"}
                        </strong>

                        {colors.length > 0 && (
                          <div className="admin-order-colors-preview">
                            {colors.slice(0, 2).map((color, colorIndex) => (
                              <span
                                key={`${color}-${colorIndex}`}
                                className="admin-order-color-preview"
                              >
                                <span className="admin-order-color-dot"></span>
                                {color}
                              </span>
                            ))}

                            {colors.length > 2 && (
                              <span className="admin-order-more-colors">
                                +{colors.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* TOTAL */}

                    <td>
                      <strong className="admin-order-total">
                        Rs. {getTotal(order).toLocaleString()}
                      </strong>
                    </td>

                    {/* PAYMENT */}

                    <td>
                      <span className="admin-payment-method">
                        {getPaymentMethod(order)}
                      </span>
                    </td>

                    {/* STATUS */}

                    <td>
                      <span
                        className={`admin-order-status ${getStatusClass(
                          status
                        )}`}
                      >
                        {status}
                      </span>
                    </td>

                    {/* DATE */}

                    <td>
                      <span className="admin-order-date">
                        {getDate(order)}
                      </span>
                    </td>

                    {/* ACTION */}

                    <td>
                      <div className="admin-order-actions">
                        <button
                          type="button"
                          className="admin-view-order-button"
                          onClick={() => handleViewOrder(orderId)}
                          disabled={isDeleting}
                        >
                          <Eye size={16} />
                          View
                        </button>

                        <button
                          type="button"
                          className="admin-delete-order-button"
                          onClick={() => handleDeleteOrder(orderId)}
                          disabled={isDeleting}
                          title="Delete order"
                        >
                          <Trash2 size={16} />
                          {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;