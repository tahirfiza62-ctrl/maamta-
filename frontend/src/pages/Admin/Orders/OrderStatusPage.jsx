import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Clock3,
  ClipboardCheck,
  PackageCheck,
  Truck,
  CheckCircle2,
  XCircle,
  Search,
  Eye,
  RefreshCw,
} from "lucide-react";
import "./OrderStatusPage.css";

/* =========================================================
   API CONFIG
   Same base URL as the other admin pages.
   Vite:  VITE_API_URL in .env (e.g. http://localhost:5000/api)
   CRA:   use process.env.REACT_APP_API_URL instead.
========================================================= */

const API_BASE =
  import.meta.env.VITE_API_URL || "https://maamta.onrender.com/api";

const ORDERS_URL = `${API_BASE}/admin/orders`;

const TOKEN_KEY = "mamta_admin_token";
const USER_KEY = "mamta_admin_user";

/* =========================================================
   STATUS CONFIG
   Keys must match the status values used in AdminOrders
   and AdminOrderDetails.
========================================================= */

const STATUS_CONFIG = {
  Pending: {
    title: "Pending Orders",
    description: "Orders waiting for confirmation.",
    icon: Clock3,
    className: "pending",
  },

  Confirmed: {
    title: "Confirmed Orders",
    description: "Orders that have been confirmed.",
    icon: ClipboardCheck,
    className: "confirmed",
  },

  Processing: {
    title: "Processing Orders",
    description: "Orders currently being prepared.",
    icon: PackageCheck,
    className: "processing",
  },

  Shipped: {
    title: "Shipped Orders",
    description: "Orders that have been shipped.",
    icon: Truck,
    className: "shipped",
  },

  Delivered: {
    title: "Delivered Orders",
    description: "Successfully delivered orders.",
    icon: CheckCircle2,
    className: "delivered",
  },

  Cancelled: {
    title: "Cancelled Orders",
    description: "Orders that have been cancelled.",
    icon: XCircle,
    className: "cancelled",
  },
};

/* =========================================================
   HELPERS
========================================================= */

const getOrderId = (order) => order._id || order.id || "";

/* Backend stores the current status in `orderStatus` */
const getStatus = (order) => order.orderStatus || order.status || "Pending";

const extractOrders = (data) => {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.orders)) {
    return data.orders;
  }

  return [];
};

const getOrderLabel = (order) =>
  order.orderNumber
    ? String(order.orderNumber)
    : String(getOrderId(order)).slice(-8);

const getDate = (order) => {
  if (!order.createdAt) {
    return "N/A";
  }

  const parsed = new Date(order.createdAt);

  return Number.isNaN(parsed.getTime())
    ? "N/A"
    : parsed.toLocaleDateString();
};

/* =========================================================
   ORDER STATUS PAGE
   Usage: <OrderStatusPage status="Pending" />
========================================================= */

const OrderStatusPage = ({ status }) => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const config = STATUS_CONFIG[status];

  /* =======================================================
     FETCH ORDERS (single source of truth)
     GET /api/admin/orders
  ======================================================= */

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        navigate("/admin");
        return;
      }

      const response = await axios.get(ORDERS_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });

      /* Keep only orders that match this page's status */
      const matching = extractOrders(response.data).filter(
        (order) => getStatus(order) === status
      );

      setOrders(matching);
    } catch (err) {
      console.error("FETCH ORDERS ERROR:", err);

      const code = err.response?.status;

      if (code === 401 || code === 403) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        navigate("/admin");
        return;
      }

      setError(
        err.response?.data?.message ||
          (err.request && !err.response
            ? "Cannot reach the server. If it was idle, wait a minute and press Refresh."
            : "Failed to load orders.")
      );
    } finally {
      setLoading(false);
    }
  }, [status, navigate]);

  /* =======================================================
     INITIAL LOAD / STATUS CHANGE
  ======================================================= */

  useEffect(() => {
    /* Clear the old list and search when switching status pages */
    setOrders([]);
    setSearch("");

    if (config) {
      fetchOrders();
    }
  }, [fetchOrders, config]);

  /* =======================================================
     SEARCH FILTER
  ======================================================= */

  const filteredOrders = useMemo(() => {
    const searchText = search.toLowerCase().trim();

    if (!searchText) {
      return orders;
    }

    return orders.filter((order) =>
      [
        order.orderNumber,
        getOrderId(order),
        order.customer?.name,
        order.customer?.email,
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(searchText)
      )
    );
  }, [orders, search]);

  /* =======================================================
     INVALID STATUS
  ======================================================= */

  if (!config) {
    return (
      <div className="order-status-page">
        <div className="order-status-error">Invalid order status.</div>
      </div>
    );
  }

  const StatusIcon = config.icon;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="order-status-page">
      {/* HEADER */}

      <div className="order-status-header">
        <div>
          <div className={`order-status-icon ${config.className}`}>
            <StatusIcon size={24} />
          </div>

          <div className="order-status-heading">
            <h1>{config.title}</h1>
            <p>{config.description}</p>
          </div>
        </div>

        <button
          className="order-refresh-btn"
          onClick={fetchOrders}
          disabled={loading}
        >
          <RefreshCw
            size={17}
            className={loading ? "order-refresh-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* SEARCH */}

      <div className="order-status-toolbar">
        <div className="order-search-box">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search order number, customer or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={`order-count-badge ${config.className}`}>
          {filteredOrders.length}{" "}
          {filteredOrders.length === 1 ? "Order" : "Orders"}
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="order-status-error" role="alert">
          {error}
        </div>
      )}

      {/* CONTENT */}

      {loading ? (
        <div className="order-status-empty">
          <div className="order-loader"></div>
          <p>Loading orders...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="order-status-empty">
          <StatusIcon size={42} />

          <h3>
            {search.trim()
              ? "No matching orders"
              : `No ${status.toLowerCase()} orders`}
          </h3>

          <p>
            {search.trim()
              ? "Try a different search term."
              : `There are currently no orders with "${status}" status.`}
          </p>
        </div>
      ) : (
        <div className="orders-table-card">
          <div className="orders-table-wrapper">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order, index) => {
                  const orderId = getOrderId(order);

                  return (
                    <tr key={orderId || index}>
                      {/* ORDER */}

                      <td>
                        <strong>#{getOrderLabel(order)}</strong>
                      </td>

                      {/* CUSTOMER */}

                      <td>
                        <div className="customer-info">
                          <strong>{order.customer?.name || "N/A"}</strong>
                          <span>{order.customer?.email || "N/A"}</span>
                        </div>
                      </td>

                      {/* ITEMS */}

                      <td>{order.items?.length || 0}</td>

                      {/* TOTAL */}

                      <td>
                        <strong>
                          Rs. {Number(order.total || 0).toLocaleString()}
                        </strong>
                      </td>

                      {/* PAYMENT */}

                      <td>
                        <span
                          className={`payment-badge ${
                            order.paymentStatus?.toLowerCase() || ""
                          }`}
                        >
                          {order.paymentStatus || "Pending"}
                        </span>
                      </td>

                      {/* STATUS */}

                      <td>
                        <span className={`status-badge ${config.className}`}>
                          {getStatus(order)}
                        </span>
                      </td>

                      {/* DATE */}

                      <td>{getDate(order)}</td>

                      {/* ACTION */}

                      <td>
                        <button
                          className="view-order-btn"
                          disabled={!orderId}
                          onClick={() => navigate(`/admin/orders/${orderId}`)}
                        >
                          <Eye size={16} />
                          View
                        </button>
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

export default OrderStatusPage;