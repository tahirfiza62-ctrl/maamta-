import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import {
  CreditCard,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock3,
  XCircle,
  AlertCircle,
  WalletCards,
  Banknote,
} from "lucide-react";

import "./AdminPayments.css";

/* =========================================================
   API CONFIG
   Same base URL as the other admin pages.
   Vite:  VITE_API_URL in .env (e.g. http://localhost:5000/api)
   CRA:   use process.env.REACT_APP_API_URL instead.

   NOTE: the base URL is NOT the payments endpoint. The list
   lives at GET /api/admin/payments. Confirm this path matches
   your backend router.
========================================================= */

const API_BASE =
  import.meta.env.VITE_API_URL || "https://maamta.onrender.com/api";

const PAYMENTS_URL = `${API_BASE}/admin/payments`;

const TOKEN_KEY = "mamta_admin_token";
const USER_KEY = "mamta_admin_user";

const EMPTY_STATS = {
  totalPayments: 0,
  paidPayments: 0,
  pendingPayments: 0,
  failedPayments: 0,
  cancelledPayments: 0,
  totalRevenue: 0,
  pendingAmount: 0,
};

const PAYMENT_STATUSES = ["Paid", "Pending", "Failed", "Cancelled"];

const DEFAULT_METHODS = ["Cash on Delivery", "Online Payment"];

/* =========================================================
   HELPERS
========================================================= */

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

const getPaymentIcon = (status) => {
  switch (status) {
    case "Paid":
      return <CheckCircle2 size={14} />;

    case "Failed":
      return <XCircle size={14} />;

    case "Cancelled":
      return <AlertCircle size={14} />;

    default:
      return <Clock3 size={14} />;
  }
};

const getPaymentClass = (status) => {
  switch (status) {
    case "Paid":
      return "paid";

    case "Failed":
      return "failed";

    case "Cancelled":
      return "cancelled";

    default:
      return "pending";
  }
};

/* =========================================================
   ADMIN PAYMENTS
========================================================= */

const AdminPayments = () => {
  const navigate = useNavigate();

  /* =======================================================
     STATE
  ======================================================= */

  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  /* =======================================================
     FETCH PAYMENTS (single source of truth)
     GET /api/admin/payments
     `isRefresh` shows the small refresh spinner instead of
     the full-page loader.
  ======================================================= */

  const fetchPayments = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const token = localStorage.getItem(TOKEN_KEY);

        if (!token) {
          navigate("/admin");
          return;
        }

        const response = await axios.get(PAYMENTS_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = response.data;

        setPayments(
          Array.isArray(data?.payments)
            ? data.payments
            : Array.isArray(data)
            ? data
            : []
        );

        setStats({ ...EMPTY_STATS, ...(data?.stats || {}) });
      } catch (err) {
        console.error("FETCH PAYMENTS ERROR:", err);

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
              : "Failed to load payments.")
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate]
  );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

useEffect(() => {
  let isMounted = true;

  const loadPayments = async () => {
    await Promise.resolve();

    if (isMounted) {
      fetchPayments();
    }
  };

  loadPayments();

  return () => {
    isMounted = false;
  };
}, [fetchPayments]);
  /* =======================================================
     PAYMENT METHODS (defaults + any others found in data)
  ======================================================= */

  const methods = useMemo(() => {
    const fromData = payments
      .map((payment) => payment.paymentMethod)
      .filter(Boolean);

    return [...new Set([...DEFAULT_METHODS, ...fromData])];
  }, [payments]);

  /* =======================================================
     FILTER PAYMENTS
  ======================================================= */

  const filteredPayments = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return payments.filter((payment) => {
      const matchesSearch =
        !searchText ||
        [
          payment.orderNumber,
          payment.customer?.name,
          payment.customer?.email,
          payment.paymentReference,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(searchText)
        );

      const matchesStatus =
        statusFilter === "All" ||
        (payment.paymentStatus || "Pending") === statusFilter;

      const matchesMethod =
        methodFilter === "All" || payment.paymentMethod === methodFilter;

      return matchesSearch && matchesStatus && matchesMethod;
    });
  }, [payments, search, statusFilter, methodFilter]);

  const hasActiveFilters =
    search.trim() !== "" || statusFilter !== "All" || methodFilter !== "All";

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="admin-payments-page">
        <div className="payments-loading">
          <div className="payments-loader"></div>
          <p>Loading payments...</p>
        </div>
      </div>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="admin-payments-page">
      {/* HEADER */}

      <div className="payments-page-header">
        <div className="payments-heading">
          <div className="payments-heading-icon">
            <CreditCard size={23} />
          </div>

          <div>
            <span>MAMTA ADMIN</span>
            <h1>Payments</h1>
            <p>Monitor customer payments and transaction status.</p>
          </div>
        </div>

        <button
          type="button"
          className="payments-refresh-btn"
          onClick={() => fetchPayments(true)}
          disabled={refreshing}
        >
          <RefreshCw
            size={17}
            className={refreshing ? "refresh-spinning" : ""}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* ERROR */}

      {error && (
        <div className="payments-error" role="alert">
          {error}
        </div>
      )}

      {/* STATISTICS */}

      <div className="payments-stats">
        <div className="payment-stat-card">
          <div className="payment-stat-icon total">
            <WalletCards size={20} />
          </div>

          <div>
            <span>Total Payments</span>
            <strong>{stats.totalPayments}</strong>
          </div>
        </div>

        <div className="payment-stat-card">
          <div className="payment-stat-icon paid">
            <CheckCircle2 size={20} />
          </div>

          <div>
            <span>Paid</span>
            <strong>{stats.paidPayments}</strong>
          </div>
        </div>

        <div className="payment-stat-card">
          <div className="payment-stat-icon pending">
            <Clock3 size={20} />
          </div>

          <div>
            <span>Pending</span>
            <strong>{stats.pendingPayments}</strong>
          </div>
        </div>

        <div className="payment-stat-card">
          <div className="payment-stat-icon failed">
            <XCircle size={20} />
          </div>

          <div>
            <span>Failed</span>
            <strong>{stats.failedPayments}</strong>
          </div>
        </div>

        <div className="payment-stat-card">
          <div className="payment-stat-icon cancelled">
            <AlertCircle size={20} />
          </div>

          <div>
            <span>Cancelled</span>
            <strong>{stats.cancelledPayments}</strong>
          </div>
        </div>
      </div>

      {/* REVENUE CARDS */}

      <div className="payments-money-grid">
        <div className="payment-money-card">
          <div className="payment-money-icon">
            <Banknote size={21} />
          </div>

          <div>
            <span>Paid Revenue</span>

            <strong>
              Rs. {Number(stats.totalRevenue || 0).toLocaleString()}
            </strong>

            <p>Total successfully paid amount</p>
          </div>
        </div>

        <div className="payment-money-card">
          <div className="payment-money-icon pending-money">
            <Clock3 size={21} />
          </div>

          <div>
            <span>Pending Amount</span>

            <strong>
              Rs. {Number(stats.pendingAmount || 0).toLocaleString()}
            </strong>

            <p>Amount awaiting payment</p>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}

      <div className="payments-toolbar">
        <div className="payments-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search order, customer or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="payments-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by payment status"
        >
          <option value="All">All Payment Status</option>

          {PAYMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          className="payments-filter"
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          aria-label="Filter by payment method"
        >
          <option value="All">All Methods</option>

          {methods.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>

        <div className="payments-count">
          {filteredPayments.length}{" "}
          {filteredPayments.length === 1 ? "Payment" : "Payments"}
        </div>
      </div>

      {/* CONTENT */}

      {filteredPayments.length === 0 ? (
        <div className="payments-empty">
          <div className="payments-empty-icon">
            <CreditCard size={34} />
          </div>

          <h3>{hasActiveFilters ? "No payments found" : "No payments yet"}</h3>

          <p>
            {hasActiveFilters
              ? "Try changing your search or filters."
              : "Customer payments will appear here when orders are placed."}
          </p>
        </div>
      ) : (
        <div className="payments-table-card">
          <div className="payments-table-wrapper">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Payment</th>
                  <th>Order Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredPayments.map((payment, index) => {
                  /* The View button opens the ORDER, so prefer the
                     order id when the API sends one separately. */
                  const orderId =
                    payment.orderId || payment._id || payment.id || "";

                  const orderLabel = payment.orderNumber
                    ? String(payment.orderNumber)
                    : String(orderId).slice(-8);

                  const paymentStatus = payment.paymentStatus || "Pending";

                  return (
                    <tr key={payment._id || payment.id || index}>
                      {/* ORDER */}

                      <td>
                        <strong>#{orderLabel}</strong>
                      </td>

                      {/* CUSTOMER */}

                      <td>
                        <div className="payment-customer">
                          <div className="payment-customer-avatar">
                            {payment.customer?.name
                              ?.charAt(0)
                              ?.toUpperCase() || "C"}
                          </div>

                          <div>
                            <strong>
                              {payment.customer?.name || "Unknown Customer"}
                            </strong>

                            <span>
                              {payment.customer?.email || "No email"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* AMOUNT */}

                      <td>
                        <strong className="payment-amount">
                          Rs. {Number(payment.total || 0).toLocaleString()}
                        </strong>
                      </td>

                      {/* METHOD */}

                      <td>
                        <span className="payment-method">
                          {payment.paymentMethod || "N/A"}
                        </span>
                      </td>

                      {/* REFERENCE */}

                      <td>
                        <span className="payment-reference">
                          {payment.paymentReference || "—"}
                        </span>
                      </td>

                      {/* PAYMENT STATUS */}

                      <td>
                        <span
                          className={`payment-status ${getPaymentClass(
                            paymentStatus
                          )}`}
                        >
                          {getPaymentIcon(paymentStatus)}
                          {paymentStatus}
                        </span>
                      </td>

                      {/* ORDER STATUS */}

                      <td>
                        <span
                          className={`payment-order-status ${String(
                            payment.orderStatus || "Pending"
                          )
                            .toLowerCase()
                            .replace(/\s+/g, "-")}`}
                        >
                          {payment.orderStatus || "Pending"}
                        </span>
                      </td>

                      {/* DATE */}

                      <td>{formatDate(payment.createdAt)}</td>

                      {/* ACTION */}

                      <td>
                        <button
                          type="button"
                          className="payment-view-btn"
                          disabled={!orderId}
                          onClick={() => navigate(`/admin/orders/${orderId}`)}
                        >
                          <Eye size={15} />
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

export default AdminPayments;