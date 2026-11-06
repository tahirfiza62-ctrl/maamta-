import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

import {
  ArrowLeft,
  UserRound,
  Mail,
  CalendarDays,
  ShieldCheck,
  ShieldOff,
  ShoppingBag,
  RefreshCw,
  Hash,
  Package,
  Clock3,
  CheckCircle2,
  Truck,
  XCircle,
} from "lucide-react";

import "./AdminCustomerDetails.css";

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

const formatDate = (date, month = "short") => {
  if (!date) {
    return "N/A";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }

  return parsed.toLocaleDateString("en-PK", {
    day: "2-digit",
    month,
    year: "numeric",
  });
};

const getStatusIcon = (status) => {
  switch (status) {
    case "Delivered":
      return <CheckCircle2 size={14} />;

    case "Shipped":
      return <Truck size={14} />;

    case "Processing":
      return <Package size={14} />;

    case "Cancelled":
      return <XCircle size={14} />;

    default:
      return <Clock3 size={14} />;
  }
};

const getStatusClass = (status) => {
  switch (status) {
    case "Delivered":
      return "delivered";

    case "Shipped":
      return "shipped";

    case "Processing":
      return "processing";

    case "Cancelled":
      return "cancelled";

    case "Confirmed":
      return "confirmed";

    default:
      return "pending";
  }
};

/* =========================================================
   ADMIN CUSTOMER DETAILS
========================================================= */

const AdminCustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  /* =======================================================
     STATE
  ======================================================= */

  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  /* =======================================================
     FETCH CUSTOMER (single source of truth)
     GET /api/admin/customers/:id
     `isCancelled` lets the effect ignore a stale response.
  ======================================================= */

  const fetchCustomer = useCallback(
    async (isCancelled = () => false) => {
      try {
        setLoading(true);
        setError("");
        setNotFound(false);

        const token = localStorage.getItem(TOKEN_KEY);

        if (!token) {
          navigate("/admin");
          return;
        }

        const response = await axios.get(`${CUSTOMERS_URL}/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (isCancelled()) {
          return;
        }

        const loadedCustomer = response.data?.customer || null;
        const loadedOrders = Array.isArray(response.data?.orders)
          ? response.data.orders
          : [];

        setCustomer(loadedCustomer);
        setOrders(loadedOrders);
        setTotalOrders(response.data?.totalOrders ?? loadedOrders.length);

        if (!loadedCustomer) {
          setNotFound(true);
        }
      } catch (err) {
        if (isCancelled()) {
          return;
        }

        console.error("FETCH CUSTOMER DETAILS ERROR:", err);

        const code = err.response?.status;

        if (code === 401 || code === 403) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          navigate("/admin");
          return;
        }

        setCustomer(null);

        if (code === 404) {
          setNotFound(true);
        } else {
          setError(
            err.response?.data?.message ||
              (err.request && !err.response
                ? "Cannot reach the server. If it was idle, wait a minute and try again."
                : "Failed to load customer details.")
          );
        }
      } finally {
        if (!isCancelled()) {
          setLoading(false);
        }
      }
    },
    [id, navigate]
  );

  /* =======================================================
     INITIAL LOAD / ID CHANGE
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    fetchCustomer(() => cancelled);

    return () => {
      cancelled = true;
    };
  }, [fetchCustomer]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="admin-customer-details-page">
        <div className="customer-details-loading">
          <div className="customer-details-loader"></div>
          <p>Loading customer details...</p>
        </div>
      </div>
    );
  }

  /* =======================================================
     ERROR / NOT FOUND
  ======================================================= */

  if (error || !customer) {
    return (
      <div className="admin-customer-details-page">
        <button
          type="button"
          className="customer-details-back-btn"
          onClick={() => navigate("/admin/customers")}
        >
          <ArrowLeft size={17} />
          Back to Customers
        </button>

        <div className="customer-details-error" role={error ? "alert" : undefined}>
          <UserRound size={34} />

          <h2>{notFound || !error ? "Customer Not Found" : "Unable to Load Customer"}</h2>

          <p>{error || "The requested customer could not be found."}</p>

          <button type="button" onClick={() => navigate("/admin/customers")}>
            View Customers
          </button>
        </div>
      </div>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  const active = customer.active !== false;

  return (
    <div className="admin-customer-details-page">
      {/* HEADER */}

      <div className="customer-details-header">
        <div>
          <button
            type="button"
            className="customer-details-back-btn"
            onClick={() => navigate("/admin/customers")}
          >
            <ArrowLeft size={17} />
            Back to Customers
          </button>

          <div className="customer-details-title">
            <div className="customer-details-title-icon">
              <UserRound size={23} />
            </div>

            <div>
              <span>MAMTA ADMIN</span>
              <h1>Customer Details</h1>
              <p>View customer account information.</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="customer-details-refresh-btn"
          onClick={() => fetchCustomer()}
          disabled={loading}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {/* CUSTOMER PROFILE */}

      <div className="customer-profile-card">
        <div className="customer-profile-top">
          <div className="customer-large-avatar">
            {customer.name?.charAt(0)?.toUpperCase() || "C"}
          </div>

          <div className="customer-profile-main">
            <h2>{customer.name || "Unnamed Customer"}</h2>

            <p>
              <Mail size={15} />
              {customer.email || "No email available"}
            </p>

            <span
              className={`customer-details-status ${
                active ? "active" : "inactive"
              }`}
            >
              {active ? (
                <>
                  <ShieldCheck size={14} />
                  Active Account
                </>
              ) : (
                <>
                  <ShieldOff size={14} />
                  Inactive Account
                </>
              )}
            </span>
          </div>
        </div>

        <div className="customer-information-grid">
          <div className="customer-information-item">
            <div className="information-icon">
              <UserRound size={17} />
            </div>

            <div>
              <span>Customer Name</span>
              <strong>{customer.name || "N/A"}</strong>
            </div>
          </div>

          <div className="customer-information-item">
            <div className="information-icon">
              <Mail size={17} />
            </div>

            <div>
              <span>Email Address</span>
              <strong>{customer.email || "N/A"}</strong>
            </div>
          </div>

          <div className="customer-information-item">
            <div className="information-icon">
              <CalendarDays size={17} />
            </div>

            <div>
              <span>Registered On</span>
              <strong>{formatDate(customer.createdAt, "long")}</strong>
            </div>
          </div>

          <div className="customer-information-item">
            <div className="information-icon">
              {active ? <ShieldCheck size={17} /> : <ShieldOff size={17} />}
            </div>

            <div>
              <span>Account Status</span>
              <strong>{active ? "Active" : "Inactive"}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* SUMMARY */}

      <div className="customer-summary-grid">
        <div className="customer-summary-card">
          <div className="customer-summary-icon">
            <ShoppingBag size={21} />
          </div>

          <div>
            <span>Total Orders</span>
            <strong>{totalOrders}</strong>
            <p>Orders placed by this customer</p>
          </div>
        </div>

        <div className="customer-summary-card">
          <div className="customer-summary-icon">
            <Hash size={21} />
          </div>

          <div>
            <span>Customer ID</span>

            <strong>
              {customer._id ? String(customer._id).slice(-8).toUpperCase() : "N/A"}
            </strong>

            <p>Registered MAMTA customer</p>
          </div>
        </div>

        <div className="customer-summary-card">
          <div className="customer-summary-icon">
            <ShieldCheck size={21} />
          </div>

          <div>
            <span>Account Role</span>
            <strong>{customer.role || "customer"}</strong>
            <p>Standard customer account</p>
          </div>
        </div>
      </div>

      {/* ORDER HISTORY */}

      <div className="customer-orders-section">
        <div className="customer-orders-heading">
          <div>
            <span>ORDER HISTORY</span>
            <h2>Customer Orders</h2>
            <p>Orders placed by {customer.name || "this customer"}.</p>
          </div>

          <div className="customer-orders-count">
            {totalOrders} {totalOrders === 1 ? "Order" : "Orders"}
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="customer-orders-empty">
            <div className="customer-orders-empty-icon">
              <ShoppingBag size={30} />
            </div>

            <h3>No Orders Yet</h3>

            <p>This customer has not placed any orders yet.</p>
          </div>
        ) : (
          <div className="customer-orders-card">
            <div className="customer-orders-table-wrapper">
              <table className="customer-orders-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {orders.map((order, index) => {
                    const orderId = order._id || order.id || "";
                    const paymentStatus = order.paymentStatus || "Pending";
                    const orderStatus = order.orderStatus || "Pending";

                    return (
                      <tr key={orderId || index}>
                        <td>
                          <strong>
                            #
                            {order.orderNumber
                              ? order.orderNumber
                              : String(orderId).slice(-8)}
                          </strong>
                        </td>

                        <td>{order.items?.length || 0}</td>

                        <td>
                          <strong>
                            Rs. {Number(order.total || 0).toLocaleString()}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={`customer-payment-status ${paymentStatus.toLowerCase()}`}
                          >
                            {paymentStatus}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`customer-order-status ${getStatusClass(
                              orderStatus
                            )}`}
                          >
                            {getStatusIcon(orderStatus)}
                            {orderStatus}
                          </span>
                        </td>

                        <td>{formatDate(order.createdAt)}</td>

                        <td>
                          <button
                            type="button"
                            className="customer-order-view-btn"
                            disabled={!orderId}
                            onClick={() => navigate(`/admin/orders/${orderId}`)}
                          >
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
    </div>
  );
};

export default AdminCustomerDetails;