import { useCallback, useEffect, useState } from "react";
import axios from "axios";

import {
  ArrowLeft,
  Package,
  User,
  MapPin,
  CreditCard,
  CalendarDays,
  Save,
} from "lucide-react";

import { useNavigate, useParams } from "react-router-dom";

import "./AdminOrderDetails.css";

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

const FALLBACK_IMAGE =
  "https://placehold.co/100x100/F4D9DC/4A3032?text=MAMTA";

const DEFAULT_COLOR_CODE = "#e7d8d3";

const STATUS_OPTIONS = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

/* Fallback colors for old orders that have no stored color code */
const COLOR_MAP = {
  pink: "#F4A6C1",
  "blush pink": "#F7C4D4",
  "dusty rose": "#C48A9A",
  rose: "#E8A0B5",
  mauve: "#B7849A",
  lavender: "#C8B6E2",
  purple: "#B39DDB",
  lilac: "#C8A2C8",
  blue: "#8DB9E8",
  "baby blue": "#A9D6F5",
  "sky blue": "#87CEEB",
  "navy blue": "#1F3A5F",
  "royal blue": "#4169E1",
  teal: "#4FA7A0",
  mint: "#A8D5BA",
  green: "#91B89A",
  "sage green": "#A3B18A",
  olive: "#808000",
  cream: "#F5E6C8",
  ivory: "#FFFFF0",
  white: "#FFFFFF",
  "off white": "#F8F4EC",
  beige: "#D8C3A5",
  nude: "#E6C7B2",
  camel: "#C19A6B",
  brown: "#8B5E3C",
  chocolate: "#5C4033",
  grey: "#A7A7A7",
  "light grey": "#D3D3D3",
  charcoal: "#36454F",
  black: "#222222",
  yellow: "#F5D76E",
  mustard: "#D4A017",
  orange: "#F4A261",
  peach: "#FFCBA4",
  coral: "#FF7F7F",
  red: "#E57373",
  maroon: "#800000",
  wine: "#722F37",
  burgundy: "#800020",
  turquoise: "#40E0D0",
  "sea green": "#2E8B57",
  "peacock blue": "#006D77",
  denim: "#1560BD",
  terracotta: "#C66B3D",
  khaki: "#C3B091",
};

/* =========================================================
   HELPERS (pure, defined once outside the component)
========================================================= */

const getCustomerName = (order) =>
  order?.customer?.name || order?.customerName || order?.name || "—";

const getCustomerEmail = (order) =>
  order?.customer?.email || order?.email || "—";

const getCustomerPhone = (order) =>
  order?.customer?.phone || order?.phone || "—";

const getAddress = (order) => {
  const address =
    order?.shippingAddress ||
    order?.address ||
    order?.deliveryAddress ||
    order?.customer?.address;

  if (typeof address === "string" && address.trim()) {
    return address;
  }

  if (address && typeof address === "object") {
    const text = [
      address.address,
      address.street,
      address.area,
      address.city,
      address.state,
      address.postalCode,
    ]
      .filter(Boolean)
      .join(", ");

    return text || "—";
  }

  return "—";
};

const getPaymentMethod = (order) =>
  order?.paymentMethod || order?.payment?.method || "—";

const getOrderDate = (order) => {
  const date = order?.createdAt || order?.date;

  if (!date) {
    return "—";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleString("en-PK", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getSubtotal = (order) => {
  if (typeof order?.subtotal === "number") {
    return order.subtotal;
  }

  if (Array.isArray(order?.items)) {
    return order.items.reduce(
      (total, item) =>
        total + Number(item.price || 0) * Number(item.quantity || 0),
      0
    );
  }

  return 0;
};

const getShipping = (order) =>
  Number(order?.shipping ?? order?.shippingFee ?? 0);

const getTotal = (order) => {
  if (typeof order?.total === "number") {
    return order.total;
  }

  return getSubtotal(order) + getShipping(order);
};

const getColorName = (item) => {
  if (!item) {
    return "";
  }

  if (typeof item.color === "string") {
    return item.color.trim();
  }

  if (item.color && typeof item.color === "object") {
    return (
      item.color.name ||
      item.color.colorName ||
      item.color.value ||
      item.color.label ||
      ""
    );
  }

  return "";
};

/* New orders store the exact code; old orders use COLOR_MAP */
const getColorCode = (item) => {
  if (!item) {
    return DEFAULT_COLOR_CODE;
  }

  if (item.colorCode && typeof item.colorCode === "string") {
    return item.colorCode;
  }

  const colorName = getColorName(item).toLowerCase().trim();

  return COLOR_MAP[colorName] || DEFAULT_COLOR_CODE;
};

const getItemImage = (item) => {
  if (item?.colorImage && typeof item.colorImage === "string") {
    return item.colorImage;
  }

  if (item?.image && typeof item.image === "string") {
    return item.image;
  }

  return FALLBACK_IMAGE;
};

const getErrorMessage = (err, fallback) => {
  if (err.response?.data?.message) {
    return err.response.data.message;
  }

  if (err.response?.data?.error) {
    return err.response.data.error;
  }

  if (err.request && !err.response) {
    return "Cannot reach the server. If it was idle, wait a minute and try again.";
  }

  return fallback;
};

/* =========================================================
   ADMIN ORDER DETAILS
========================================================= */

const AdminOrderDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [status, setStatus] = useState("Pending");

  /* =========================================================
     AUTH FAILURE
  ========================================================= */

  const handleAuthFailure = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    navigate("/admin");
  }, [navigate]);

  /* =========================================================
     FETCH ORDER
     GET /api/admin/orders/:id
  ========================================================= */

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const fetchOrder = async () => {
      try {
        setLoading(true);
        setLoadError("");

        const token = localStorage.getItem(TOKEN_KEY);

        if (!token) {
          navigate("/admin");
          return;
        }

        const response = await axios.get(`${ORDERS_URL}/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (cancelled) {
          return;
        }

        const orderData = response.data?.order || response.data;

        setOrder(orderData || null);

        setStatus(orderData?.orderStatus || orderData?.status || "Pending");
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error("ADMIN ORDER DETAILS ERROR:", err);

        const code = err.response?.status;

        if (code === 401 || code === 403) {
          handleAuthFailure();
          return;
        }

        setOrder(null);

        /* 404 means "not found"; anything else is a real error */
        if (code !== 404) {
          setLoadError(getErrorMessage(err, "Unable to load this order."));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchOrder();

    return () => {
      cancelled = true;
    };
  }, [id, navigate, handleAuthFailure]);

  /* =========================================================
     UPDATE STATUS
     PUT /api/admin/orders/:id/status
  ========================================================= */

  const handleStatusUpdate = async () => {
    if (!id || !status || saving) {
      return;
    }

    try {
      setSaving(true);

      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        navigate("/admin");
        return;
      }

      const response = await axios.put(
        `${ORDERS_URL}/${id}/status`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const updatedOrder = response.data?.order || response.data;

      setOrder((current) => ({
        ...current,
        ...(updatedOrder && typeof updatedOrder === "object"
          ? updatedOrder
          : {}),
        orderStatus: status,
        status,
      }));

      alert("Order status updated successfully.");
    } catch (err) {
      console.error("UPDATE ORDER STATUS ERROR:", err);

      const code = err.response?.status;

      if (code === 401 || code === 403) {
        handleAuthFailure();
        return;
      }

      alert(getErrorMessage(err, "Unable to update order status."));
    } finally {
      setSaving(false);
    }
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="admin-order-details-page">
        <div className="admin-order-details-loading">
          <Package size={30} />
          <p>Loading order details...</p>
        </div>
      </div>
    );
  }

  /* =========================================================
     ORDER NOT FOUND / LOAD ERROR
  ========================================================= */

  if (!order) {
    return (
      <div className="admin-order-details-page">
        <div className="admin-order-not-found">
          <Package size={35} />

          <h2>{loadError ? "Unable to load order" : "Order not found"}</h2>

          <p>{loadError || "This order could not be found."}</p>

          <button type="button" onClick={() => navigate("/admin/orders")}>
            <ArrowLeft size={17} />
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  /* =========================================================
     PAGE
  ========================================================= */

  const items = Array.isArray(order.items) ? order.items : [];
  const shipping = getShipping(order);

  /* Show the full order number if there is one; otherwise the
     last 10 characters of the database id */
  const orderLabel = order.orderNumber
    ? String(order.orderNumber)
    : String(order._id || order.id || id).slice(-10);

  return (
    <div className="admin-order-details-page">
      {/* BACK */}

      <button
        type="button"
        className="admin-order-back-button"
        onClick={() => navigate("/admin/orders")}
      >
        <ArrowLeft size={18} />
        Back to Orders
      </button>

      {/* HEADER */}

      <div className="admin-order-details-header">
        <div>
          <span className="admin-order-details-eyebrow">MAMTA ORDER</span>

          <h1>Order Details</h1>

          <p>#{orderLabel}</p>
        </div>

        <div className="admin-order-details-date">
          <CalendarDays size={17} />
          <span>{getOrderDate(order)}</span>
        </div>
      </div>

      {/* TOP GRID */}

      <div className="admin-order-details-grid">
        {/* CUSTOMER */}

        <div className="admin-order-card">
          <div className="admin-order-card-heading">
            <div className="admin-order-card-icon">
              <User size={18} />
            </div>

            <div>
              <span>CUSTOMER</span>
              <h2>Customer Information</h2>
            </div>
          </div>

          <div className="admin-order-customer-details">
            <div>
              <span>Name</span>
              <strong>{getCustomerName(order)}</strong>
            </div>

            <div>
              <span>Email</span>
              <strong>{getCustomerEmail(order)}</strong>
            </div>

            <div>
              <span>Phone</span>
              <strong>{getCustomerPhone(order)}</strong>
            </div>
          </div>
        </div>

        {/* DELIVERY */}

        <div className="admin-order-card">
          <div className="admin-order-card-heading">
            <div className="admin-order-card-icon">
              <MapPin size={18} />
            </div>

            <div>
              <span>DELIVERY</span>
              <h2>Delivery Address</h2>
            </div>
          </div>

          <div className="admin-order-address">
            <MapPin size={17} />
            <p>{getAddress(order)}</p>
          </div>
        </div>

        {/* PAYMENT */}

        <div className="admin-order-card">
          <div className="admin-order-card-heading">
            <div className="admin-order-card-icon">
              <CreditCard size={18} />
            </div>

            <div>
              <span>PAYMENT</span>
              <h2>Payment Information</h2>
            </div>
          </div>

          <div className="admin-order-payment-details">
            <span>Method</span>
            <strong>{getPaymentMethod(order)}</strong>
          </div>
        </div>
      </div>

      {/* ORDERED PRODUCTS */}

      <div className="admin-order-card admin-order-products-card">
        <div className="admin-order-card-heading">
          <div className="admin-order-card-icon">
            <Package size={18} />
          </div>

          <div>
            <span>ORDER</span>
            <h2>Ordered Products</h2>
          </div>
        </div>

        <div className="admin-order-items">
          {items.length === 0 && (
            <p className="admin-order-no-color">
              No products were found on this order.
            </p>
          )}

          {items.map((item, index) => {
            const colorName = getColorName(item);
            const colorCode = getColorCode(item);
            const itemPrice = Number(item.price || 0);
            const itemQuantity = Number(item.quantity || 0);
            const itemTotal = Number(item.total) || itemPrice * itemQuantity;

            return (
              <div
                className="admin-order-item"
                key={`${item.productId || "product"}-${
                  colorName || "default"
                }-${index}`}
              >
                {/* PRODUCT IMAGE */}

                <div className="admin-order-item-image">
                  <img
                    src={getItemImage(item)}
                    alt={item.name || "Product"}
                    onError={(e) => {
                      if (e.currentTarget.src !== FALLBACK_IMAGE) {
                        e.currentTarget.src = FALLBACK_IMAGE;
                      }
                    }}
                  />
                </div>

                {/* PRODUCT INFO */}

                <div className="admin-order-item-info">
                  <strong className="admin-order-item-name">
                    {item.name || "Product"}
                  </strong>

                  <div className="admin-order-item-color-box">
                    <span className="admin-order-color-label">
                      SELECTED COLOR
                    </span>

                    {colorName ? (
                      <div className="admin-order-color-value">
                        <span
                          className="admin-order-color-dot"
                          style={{ backgroundColor: colorCode }}
                        />

                        <span className="admin-order-color-name">
                          {colorName}
                        </span>
                      </div>
                    ) : (
                      <span className="admin-order-no-color">
                        No color selected
                      </span>
                    )}
                  </div>

                  <span className="admin-order-item-quantity">
                    Quantity: <strong>{itemQuantity}</strong>
                  </span>
                </div>

                {/* PRICE */}

                <div className="admin-order-item-price">
                  <span>
                    Rs. {itemPrice.toLocaleString()} × {itemQuantity}
                  </span>

                  <strong>Rs. {itemTotal.toLocaleString()}</strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* BOTTOM */}

      <div className="admin-order-bottom-grid">
        {/* STATUS */}

        <div className="admin-order-card">
          <div className="admin-order-card-heading">
            <div className="admin-order-card-icon">
              <Save size={18} />
            </div>

            <div>
              <span>ORDER STATUS</span>
              <h2>Update Status</h2>
            </div>
          </div>

          <div className="admin-status-update">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={saving}
              aria-label="Order status"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleStatusUpdate}
              disabled={saving}
            >
              <Save size={17} />
              {saving ? "Saving..." : "Save Status"}
            </button>
          </div>
        </div>

        {/* SUMMARY */}

        <div className="admin-order-card admin-order-summary-card">
          <div className="admin-order-card-heading">
            <div className="admin-order-card-icon">
              <Package size={18} />
            </div>

            <div>
              <span>SUMMARY</span>
              <h2>Order Summary</h2>
            </div>
          </div>

          <div className="admin-order-summary">
            <div>
              <span>Subtotal</span>
              <strong>Rs. {getSubtotal(order).toLocaleString()}</strong>
            </div>

            <div>
              <span>Shipping</span>
              <strong>
                {shipping === 0
                  ? "FREE"
                  : `Rs. ${shipping.toLocaleString()}`}
              </strong>
            </div>

            <div className="admin-order-summary-total">
              <span>Total</span>
              <strong>Rs. {getTotal(order).toLocaleString()}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetails;