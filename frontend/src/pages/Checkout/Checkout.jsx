
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

import {
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  User,
  ShoppingBag,
  ShieldCheck,
  CreditCard,
} from "lucide-react";

import "./Checkout.css";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://maamta.onrender.com/api";

const GUEST_CART_KEY = "mamta_guest_cart";

/* =========================================================
   HELPERS
========================================================= */

const getGuestCart = () => {
  try {
    const savedCart = JSON.parse(
      localStorage.getItem(GUEST_CART_KEY) || "[]"
    );

    if (Array.isArray(savedCart)) {
      return savedCart;
    }

    if (Array.isArray(savedCart?.items)) {
      return savedCart.items;
    }

    return [];
  } catch (error) {
    console.error("READ GUEST CART ERROR:", error);
    return [];
  }
};

const getProductId = (item) => {
  const id = item?.productId || item?._id || item?.id;

  if (typeof id === "object" && id !== null) {
    return String(id._id || id.id || "");
  }

  return String(id || "");
};

/* =========================================================
   INITIAL CUSTOMER DETAILS
========================================================= */

const getInitialFormData = () => {
  try {
    const savedUser = JSON.parse(
      localStorage.getItem("mamta_user") || "null"
    );

    return {
      name: savedUser?.name || savedUser?.fullName || "",
      email: savedUser?.email || "",
      phone: savedUser?.phone || "",
      address: "",
      city: "",
      landmark: "",
    };
  } catch (error) {
    console.error("LOAD USER ERROR:", error);

    return {
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      landmark: "",
    };
  }
};

/* =========================================================
   CHECKOUT COMPONENT
========================================================= */

const Checkout = () => {
  const navigate = useNavigate();

  /* =======================================================
     STATES
  ======================================================= */

  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState(
    "Cash on Delivery"
  );

  const [formData, setFormData] = useState(getInitialFormData);

  const token = localStorage.getItem("mamta_user_token");

  /* =======================================================
     FETCH CART
  ======================================================= */

  useEffect(() => {
    let cancelled = false;

    const fetchCart = async () => {
      try {
        setLoading(true);

        const currentToken =
          localStorage.getItem("mamta_user_token");

        // GUEST CUSTOMER
        if (!currentToken) {
          const guestItems = getGuestCart();

          if (!cancelled) {
            setCart({ items: guestItems });
          }

          return;
        }

        // LOGGED-IN CUSTOMER
        const response = await axios.get(
          `${API_URL}/cart`,
          {
            headers: {
              Authorization: `Bearer ${currentToken}`,
            },
          }
        );

        if (cancelled) return;

        const cartData =
          response.data?.cart || response.data;

        setCart({
          ...cartData,
          items: Array.isArray(cartData?.items)
            ? cartData.items
            : [],
        });
      } catch (error) {
        console.error("CHECKOUT CART ERROR:", error);

        if (cancelled) return;

        if (
          error.response?.status === 401 ||
          error.response?.status === 403
        ) {
          // Expired login: allow guest checkout
          localStorage.removeItem("mamta_user_token");
          localStorage.removeItem("mamta_user");

          window.dispatchEvent(new Event("authChanged"));

          setCart({
            items: getGuestCart(),
          });
        } else {
          setCart({ items: [] });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchCart();

    return () => {
      cancelled = true;
    };
  }, [token]);

  /* =======================================================
     FORM CHANGE
  ======================================================= */

  const handleChange = (e) => {
    const { name, value } = e.target;

    let cleanedValue = value;

    if (name === "phone") {
      cleanedValue = value.replace(/\D/g, "").slice(0, 11);
    }

    if (name === "name" || name === "city") {
      cleanedValue = value.replace(/[^a-zA-ZÀ-ÿ\s]/g, "");
    }

    if (name === "landmark") {
      cleanedValue = value.slice(0, 120);
    }

    if (name === "address") {
      cleanedValue = value.slice(0, 250);
    }

    if (name === "email") {
      cleanedValue = value.slice(0, 100);
    }

    setFormData((current) => ({
      ...current,
      [name]: cleanedValue,
    }));
  };

  /* =======================================================
     FORM VALIDATION
  ======================================================= */

  const validateForm = () => {
    const name = formData.name.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();
    const address = formData.address.trim();
    const city = formData.city.trim();
    const landmark = formData.landmark.trim();

    if (!name) {
      alert("Please enter your full name.");
      return false;
    }

    if (name.length < 3 || name.length > 50) {
      alert("Full name must be between 3 and 50 characters.");
      return false;
    }

    if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(name)) {
      alert("Full name can contain letters and spaces only.");
      return false;
    }

    if (!email) {
      alert("Please enter your email address.");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!emailRegex.test(email) || email.length > 100) {
      alert("Please enter a valid email address.");
      return false;
    }

    if (!/^03\d{9}$/.test(phone)) {
      alert(
        "Please enter a valid Pakistani phone number, e.g. 03001234567."
      );
      return false;
    }

    if (address.length < 10 || address.length > 250) {
      alert(
        "Delivery address must be between 10 and 250 characters."
      );
      return false;
    }

    if (city.length < 2 || city.length > 50) {
      alert("City name must be between 2 and 50 characters.");
      return false;
    }

    if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(city)) {
      alert("City can contain letters and spaces only.");
      return false;
    }

    if (landmark.length < 3 || landmark.length > 120) {
      alert(
        "Nearest landmark must be between 3 and 120 characters."
      );
      return false;
    }

    return true;
  };

  /* =======================================================
     ITEMS AND TOTALS
  ======================================================= */

  const items = Array.isArray(cart?.items)
    ? cart.items
    : [];

  const subtotal = items.reduce(
    (total, item) =>
      total +
      Number(item.price || 0) *
        Number(item.quantity || 0),
    0
  );

  const shipping =
    subtotal >= 5000 || subtotal === 0
      ? 0
      : 250;

  const total = subtotal + shipping;

  /* =======================================================
     COLOR HELPER
  ======================================================= */

  const getColorName = (color) => {
    if (!color) return "";

    if (typeof color === "object") {
      return (
        color.name ||
        color.colorName ||
        color.value ||
        ""
      );
    }

    return String(color);
  };

  /* =======================================================
     PLACE ORDER
  ======================================================= */

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (placingOrder) return;

    if (!validateForm()) return;

    if (items.length === 0) {
      alert("Your cart is empty.");
      navigate("/cart");
      return;
    }

    const currentToken =
      localStorage.getItem("mamta_user_token");

    // GUESTS CAN PLACE COD ORDERS.
    // ONLINE PAYMENT REMAINS LOGIN-ONLY.
    if (
      !currentToken &&
      paymentMethod === "Online Payment"
    ) {
      alert(
        "Please login to use online payment. You can place a Cash on Delivery order without an account."
      );

      return;
    }

    // Send product IDs and quantities.
    // Backend must fetch actual prices and product details.
    const orderItems = items.map((item) => ({
      productId: getProductId(item),
      quantity: Number(item.quantity || 1),
      color: getColorName(item.color),
    }));

    const orderData = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      landmark: formData.landmark.trim(),
      items: orderItems,
      paymentMethod,
    };

    try {
      setPlacingOrder(true);

      /* =================================================
         CASH ON DELIVERY
      ================================================= */

      if (paymentMethod === "Cash on Delivery") {
        const config = {};

        if (currentToken) {
          config.headers = {
            Authorization: `Bearer ${currentToken}`,
          };
        }

        const response = await axios.post(
          `${API_URL}/orders`,
          orderData,
          config
        );

        console.log("ORDER CREATED:", response.data);

        const createdOrder =
          response.data?.order || response.data;

        const orderId =
          createdOrder?._id || createdOrder?.id;

        // Clear guest cart after successful order
        if (!currentToken) {
          localStorage.removeItem(GUEST_CART_KEY);
        }

        window.dispatchEvent(new Event("cartChanged"));

        if (orderId) {
          navigate(`/order-success/${orderId}`);
        } else {
          navigate("/order-success");
        }

        return;
      }

      /* =================================================
         ONLINE PAYMENT — LOGGED-IN CUSTOMERS ONLY
      ================================================= */

      const paymentResponse = await axios.post(
        `${API_URL}/admin/payments/create`,
        orderData,
        {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }
      );

      console.log(
        "PAYMENT RESPONSE:",
        paymentResponse.data
      );

      const paymentUrl =
        paymentResponse.data?.url ||
        paymentResponse.data?.checkoutUrl ||
        paymentResponse.data?.paymentUrl ||
        paymentResponse.data?.redirectUrl;

      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        alert("Payment session could not be created.");
      }
    } catch (error) {
      console.error("CHECKOUT ORDER ERROR:", error);
      console.error(
        "CHECKOUT ORDER RESPONSE:",
        error.response?.data
      );

      if (error.response?.status === 401) {
        localStorage.removeItem("mamta_user_token");
        localStorage.removeItem("mamta_user");

        window.dispatchEvent(new Event("authChanged"));

        alert(
          "Your session has expired. You can still place a Cash on Delivery order."
        );

        return;
      }

      alert(
        error.response?.data?.message ||
          "Unable to place your order. Please try again."
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <main className="checkout-page">
        <div className="checkout-loading">
          <ShoppingBag size={30} />
          <p>Loading your checkout...</p>
        </div>
      </main>
    );
  }

  /* =======================================================
     EMPTY CART
  ======================================================= */

  if (items.length === 0) {
    return (
      <main className="checkout-page">
        <section className="checkout-empty">
          <div className="checkout-empty-icon">
            <ShoppingBag size={32} />
          </div>

          <span>MAAMTA CHECKOUT</span>

          <h1>Your cart is empty</h1>

          <p>
            Add something beautiful to your cart before
            checking out.
          </p>

          <Link
            to="/shop"
            className="checkout-back-shop"
          >
            <ArrowLeft size={17} />
            CONTINUE SHOPPING
          </Link>
        </section>
      </main>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <main className="checkout-page">
      {/* HEADER */}

      <div className="checkout-header">
        <div>
          <span className="checkout-eyebrow">
            MAAMTA
          </span>

          <h1>Checkout</h1>

          <p>
            Complete your details to place your order.
          </p>
        </div>

        <Link
          to="/cart"
          className="checkout-back-link"
        >
          <ArrowLeft size={17} />
          Back to Cart
        </Link>
      </div>

      {/* MAIN GRID */}

      <div className="checkout-container">
        {/* CUSTOMER AND DELIVERY FORM */}

        <form
          className="checkout-form"
          onSubmit={handlePlaceOrder}
          noValidate
        >
          {/* CUSTOMER INFORMATION */}

          <section className="checkout-card">
            <div className="checkout-card-heading">
              <div className="checkout-card-icon">
                <User size={18} />
              </div>

              <div>
                <span>01</span>
                <h2>Customer Information</h2>
              </div>
            </div>

            <div className="checkout-form-grid">
              <div className="checkout-field">
                <label htmlFor="checkout-name">
                  Full Name
                </label>

                <div className="checkout-input-wrapper">
                  <User size={17} />

                  <input
                    id="checkout-name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    required
                    minLength={3}
                    maxLength={50}
                    autoComplete="name"
                  />
                </div>
              </div>

              <div className="checkout-field">
                <label htmlFor="checkout-email">
                  Email Address
                </label>

                <div className="checkout-input-wrapper">
                  <Mail size={17} />

                  <input
                    id="checkout-email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                    maxLength={100}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="checkout-field checkout-phone-field">
                <label htmlFor="checkout-phone">
                  Phone Number
                </label>

                <div className="checkout-input-wrapper">
                  <Phone size={17} />

                  <input
                    id="checkout-phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="03XX XXXXXXX"
                    required
                    maxLength={11}
                    inputMode="numeric"
                    autoComplete="tel"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* DELIVERY INFORMATION */}

          <section className="checkout-card">
            <div className="checkout-card-heading">
              <div className="checkout-card-icon">
                <MapPin size={18} />
              </div>

              <div>
                <span>02</span>
                <h2>Delivery Information</h2>
              </div>
            </div>

            <div className="checkout-form-grid">
              <div className="checkout-field checkout-field-full">
                <label htmlFor="checkout-address">
                  Delivery Address
                </label>

                <div className="checkout-input-wrapper checkout-textarea-wrapper">
                  <MapPin size={17} />

                  <textarea
                    id="checkout-address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="House number, street, area..."
                    rows={4}
                    required
                    minLength={10}
                    maxLength={250}
                    autoComplete="street-address"
                  />
                </div>
              </div>

              <div className="checkout-field">
                <label htmlFor="checkout-city">
                  City
                </label>

                <div className="checkout-input-wrapper">
                  <MapPin size={17} />

                  <input
                    id="checkout-city"
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Your city"
                    required
                    minLength={2}
                    maxLength={50}
                    autoComplete="address-level2"
                  />
                </div>
              </div>

              <div className="checkout-field">
                <label htmlFor="checkout-landmark">
                  Nearest Landmark
                </label>

                <div className="checkout-input-wrapper">
                  <MapPin size={17} />

                  <input
                    id="checkout-landmark"
                    type="text"
                    name="landmark"
                    value={formData.landmark}
                    onChange={handleChange}
                    placeholder="e.g. Near Bahria Gate"
                    required
                    minLength={3}
                    maxLength={120}
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* PAYMENT METHOD */}

          <section className="checkout-card">
            <div className="checkout-card-heading">
              <div className="checkout-card-icon">
                <CreditCard size={18} />
              </div>

              <div>
                <span>03</span>
                <h2>Payment Method</h2>
              </div>
            </div>

            <div className="checkout-payment-options">
              <label
                className={
                  paymentMethod === "Cash on Delivery"
                    ? "checkout-payment-option payment-selected"
                    : "checkout-payment-option"
                }
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Cash on Delivery"
                  checked={
                    paymentMethod === "Cash on Delivery"
                  }
                  onChange={(e) =>
                    setPaymentMethod(e.target.value)
                  }
                />

                <div className="checkout-payment-radio">
                  <CheckCircle2 size={19} />
                </div>

                <div>
                  <strong>Cash on Delivery</strong>
                  <span>Pay when your order arrives.</span>
                </div>
              </label>

              <label
                className={
                  paymentMethod === "Online Payment"
                    ? "checkout-payment-option payment-selected"
                    : "checkout-payment-option"
                }
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Online Payment"
                  checked={
                    paymentMethod === "Online Payment"
                  }
                  onChange={(e) => {
                    if (
                      !localStorage.getItem(
                        "mamta_user_token"
                      )
                    ) {
                      alert(
                        "Please login to use online payment. Cash on Delivery is available without login."
                      );

                      setPaymentMethod("Cash on Delivery");
                      return;
                    }

                    setPaymentMethod(e.target.value);
                  }}
                />

                <div className="checkout-payment-radio">
                  <CreditCard size={19} />
                </div>

                <div>
                  <strong>Online Payment</strong>
                  <span>Pay securely online. Login required.</span>
                </div>
              </label>
            </div>
          </section>

          {/* PLACE ORDER */}

          <button
            type="submit"
            className="checkout-place-order"
            disabled={placingOrder}
          >
            {placingOrder
              ? "PROCESSING ORDER..."
              : "PLACE ORDER"}
          </button>

          <div className="checkout-secure">
            <ShieldCheck size={17} />

            <span>
              Your information is secure and protected.
            </span>
          </div>
        </form>

        {/* ORDER SUMMARY */}

        <aside className="checkout-summary">
          <div className="checkout-summary-header">
            <span>YOUR ORDER</span>
            <h2>Order Summary</h2>
          </div>

          {/* PRODUCTS */}

          <div className="summary-products">
            {items.map((item, index) => {
              const colorName = getColorName(item.color);
              const itemPrice = Number(item.price || 0);
              const itemQuantity = Number(item.quantity || 0);
              const itemTotal = itemPrice * itemQuantity;

              const fallbackImage =
                "https://placehold.co/100x100/F4D9DC/4A3032?text=MAMTA";

              return (
                <div
                  className="summary-product"
                  key={`${getProductId(item)}-${item.color || ""}-${index}`}
                >
                  <div className="summary-product-image">
                    <img
                      src={item.image || fallbackImage}
                      alt={item.name || "Product"}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = fallbackImage;
                      }}
                    />
                  </div>

                  <div className="summary-product-info">
                    <h3>{item.name}</h3>

                    <p>
                      Rs. {itemPrice.toLocaleString()}
                    </p>

                    {colorName && (
                      <span className="checkout-product-color">
                        <span className="checkout-color-dot" />
                        Color: {colorName}
                      </span>
                    )}

                    <span className="checkout-product-quantity">
                      Quantity: {itemQuantity}
                    </span>
                  </div>

                  <strong>
                    Rs. {itemTotal.toLocaleString()}
                  </strong>
                </div>
              );
            })}
          </div>

          {/* TOTALS */}

          <div className="summary-totals">
            <div>
              <span>Subtotal</span>

              <strong>
                Rs. {subtotal.toLocaleString()}
              </strong>
            </div>

            <div>
              <span>Shipping</span>

              <strong>
                {shipping === 0
                  ? "Included"
                  : `Rs. ${shipping.toLocaleString()}`}
              </strong>
            </div>

            <div className="summary-total">
              <span>Total</span>

              <strong>
                Rs. {total.toLocaleString()}
              </strong>
            </div>
          </div>

          {/* SHIPPING NOTE */}

          <div className="checkout-delivery-note">
            <TruckIcon />

            <div>
              <strong>
                {shipping === 0
                  ? "Shipping Included"
                  : "Shipping Charges"}
              </strong>

              <span>
                {shipping === 0
                  ? "No additional shipping charge."
                  : `Rs. ${shipping.toLocaleString()} delivery charge.`}
              </span>
            </div>
          </div>

          {subtotal > 0 && subtotal < 5000 && (
            <div className="checkout-delivery-note">
              <ShoppingBag size={20} />

              <div>
                <strong>Shipping Offer</strong>

                <span>
                  Add Rs.{" "}
                  {(5000 - subtotal).toLocaleString()} more
                  to qualify for shipping at no extra cost.
                </span>
              </div>
            </div>
          )}

          {/* DELIVERY TIME */}

          <div className="checkout-delivery-note">
            <MapPin size={20} />

            <div>
              <strong>Estimated Delivery</strong>
              <span>3–4 working days</span>
            </div>
          </div>

          {/* SECURE NOTE */}

          <div className="checkout-summary-secure">
            <ShieldCheck size={18} />

            <span>Safe &amp; secure checkout</span>
          </div>
        </aside>
      </div>
    </main>
  );
};

/* =========================================================
   SIMPLE TRUCK ICON
========================================================= */

const TruckIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M10 17h4V5H2v12h3" />
    <path d="M14 8h4l4 4v5h-2" />
    <circle cx="7.5" cy="17.5" r="2.5" />
    <circle cx="16.5" cy="17.5" r="2.5" />
  </svg>
);

export default Checkout;
