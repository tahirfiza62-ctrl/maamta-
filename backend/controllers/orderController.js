const mongoose = require("mongoose");

const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Order = require("../models/Order");

const sendPushNotification = require("../utils/sendPushNotification");
const sendOrderEmail = require("../utils/sendOrderEmail");

/* =========================================================
   CREATE ORDER — GUEST + LOGGED-IN
========================================================= */

const createOrder = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      city,
      paymentMethod,
      items: guestItems,
    } = req.body;

    const isLoggedIn = Boolean(req.user?._id);

    /* =====================================================
       CUSTOMER VALIDATION
    ===================================================== */

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Name is required.",
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required.",
      });
    }

    if (!address || !address.trim()) {
      return res.status(400).json({
        success: false,
        message: "Address is required.",
      });
    }

    if (!city || !city.trim()) {
      return res.status(400).json({
        success: false,
        message: "City is required.",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const phoneRegex = /^03\d{9}$/;

    if (!phoneRegex.test(phone.trim())) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid Pakistani phone number.",
      });
    }

    /* =====================================================
       PAYMENT METHOD

       Guest checkout is COD only.
       Online payments remain in the existing authenticated
       payment flow.
    ===================================================== */

    const requestedPaymentMethod =
      String(paymentMethod || "Cash on Delivery")
        .trim()
        .toLowerCase();

    const isCOD = [
      "cod",
      "cash on delivery",
    ].includes(requestedPaymentMethod);

    if (!isCOD) {
      return res.status(403).json({
        success: false,
        message: isLoggedIn
          ? "Please use the online payment process for online orders."
          : "Please login to use online payment.",
      });
    }

    /* =====================================================
       GET CART ITEMS

       Logged-in customer:
       Read items from MongoDB cart.

       Guest:
       Read items sent from frontend localStorage.
    ===================================================== */

    let sourceItems = [];

    if (isLoggedIn) {
      const cart = await Cart.findOne({
        userId: req.user._id,
      });

      if (!cart || !cart.items || cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Your cart is empty.",
        });
      }

      sourceItems = cart.items;
    } else {
      if (!Array.isArray(guestItems) || guestItems.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Your cart is empty.",
        });
      }

      sourceItems = guestItems;
    }

    /* =====================================================
       VALIDATE PRODUCT IDS AND QUANTITIES
    ===================================================== */

    const requestedItems = [];

    for (const item of sourceItems) {
      const productId = String(
        item.productId ||
        item._id ||
        item.id ||
        ""
      );

      const quantity = Number(item.quantity);

      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          success: false,
          message: "One of the cart products has an invalid ID.",
        });
      }

      if (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 100
      ) {
        return res.status(400).json({
          success: false,
          message: "A cart item has an invalid quantity.",
        });
      }

      requestedItems.push({
        productId,
        quantity,
        color:
          typeof item.color === "string"
            ? item.color.trim()
            : "",
      });
    }

    /* =====================================================
       FETCH REAL PRODUCTS FROM DATABASE

       Never trust price, name, or image from frontend.
    ===================================================== */

    const productIds = [
      ...new Set(requestedItems.map((item) => item.productId)),
    ];

    const products = await Product.find({
      _id: {
        $in: productIds,
      },
      active: {
        $ne: false,
      },
    });

    const productMap = new Map(
      products.map((product) => [
        String(product._id),
        product,
      ])
    );

    /* =====================================================
       BUILD VERIFIED ORDER ITEMS
    ===================================================== */

    const orderItems = [];

    for (const item of requestedItems) {
      const product = productMap.get(item.productId);

      if (!product) {
        return res.status(400).json({
          success: false,
          message: "A product in your cart is unavailable. Please refresh your cart.",
        });
      }

      const selectedColor = item.color || "";

      let matchedColor = null;

      if (selectedColor && product.colors?.length) {
        matchedColor = product.colors.find((color) => {
          const requestedColor = selectedColor.toLowerCase();

          return (
            String(color.name || "").toLowerCase() === requestedColor ||
            String(color.value || "").toLowerCase() === requestedColor ||
            String(color.code || "").toLowerCase() === requestedColor
          );
        });

        if (!matchedColor) {
          return res.status(400).json({
            success: false,
            message: `The selected color for ${product.name} is no longer available.`,
          });
        }
      }

      const price = Number(product.price);

      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid price for ${product.name}.`,
        });
      }

      const colorImage = matchedColor?.image || "";

      const image =
        colorImage ||
        product.image ||
        product.images?.[0] ||
        "";

      const colorName = matchedColor?.name || selectedColor;

      const colorCode = matchedColor?.code || "";

      orderItems.push({
        productId: String(product._id),
        name: product.name,
        image,
        price,
        quantity: item.quantity,
        color: colorName,
        colorCode,
        colorImage,
        total: price * item.quantity,
      });
    }

    /* =====================================================
       CALCULATE TOTALS
    ===================================================== */

    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.total,
      0
    );

    const shipping = subtotal >= 5000 ? 0 : 250;

    const total = subtotal + shipping;

    /* =====================================================
       CREATE ORDER
    ===================================================== */

    const orderNumber = `MAMTA-${Date.now()}`;

    const orderData = {
      // Guests have no account, so userId remains null.
      userId: isLoggedIn ? req.user._id : null,

      orderNumber,

      items: orderItems,

      customer: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
      },

      subtotal,
      shipping,
      total,

      paymentMethod: "Cash on Delivery",
      paymentStatus: "Pending",
      orderStatus: "Pending",
    };

    const order = await Order.create(orderData);

    console.log(
      `✅ ORDER CREATED: ${order.orderNumber} | ${
        isLoggedIn ? "LOGGED-IN CUSTOMER" : "GUEST CUSTOMER"
      }`
    );

    /* =====================================================
       SEND ORDER EMAIL IN BACKGROUND
    ===================================================== */

    Promise.resolve()
      .then(() => sendOrderEmail(order))
      .then(() => {
        console.log(
          `📧 ORDER EMAIL SENT: ${order.orderNumber}`
        );
      })
      .catch((error) => {
        console.error(
          `❌ ORDER EMAIL FAILED: ${order.orderNumber}`,
          error
        );
      });

    /* =====================================================
       PUSH NOTIFICATION — LOGGED-IN CUSTOMERS ONLY
    ===================================================== */

    if (isLoggedIn) {
      Promise.resolve()
        .then(() =>
          sendPushNotification({
            userId: req.user._id,
            title: "Order Placed Successfully",
            body: `Your MAMTA order ${order.orderNumber} has been placed successfully.`,
            data: {
              orderId: order._id.toString(),
              orderNumber: order.orderNumber,
            },
          })
        )
        .then(() => {
          console.log(
            `🔔 PUSH NOTIFICATION SENT: ${order.orderNumber}`
          );
        })
        .catch((error) => {
          console.error(
            "❌ PUSH NOTIFICATION FAILED:",
            error
          );
        });
    }

    /* =====================================================
       CLEAR DATABASE CART — LOGGED-IN ONLY

       Guest cart is cleared by Checkout.jsx in localStorage
       after the server confirms successful order creation.
    ===================================================== */

    if (isLoggedIn) {
      await Cart.findOneAndUpdate(
        {
          userId: req.user._id,
        },
        {
          $set: {
            items: [],
          },
        }
      );

      console.log(
        `🛒 CART CLEARED: ${order.orderNumber}`
      );
    }

    /* =====================================================
       SUCCESS RESPONSE
    ===================================================== */

    return res.status(201).json({
      success: true,
      message: "Order placed successfully.",
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        customer: order.customer,
        items: order.items,
        subtotal: order.subtotal,
        shipping: order.shipping,
        total: order.total,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ CREATE ORDER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create order.",
    });
  }
};

/* =========================================================
   GET MY ORDERS
========================================================= */

const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.user._id,
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("❌ GET MY ORDERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders.",
    });
  }
};

/* =========================================================
   GET SINGLE ORDER
========================================================= */

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("❌ GET ORDER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch order.",
    });
  }
};

/* =========================================================
   CANCEL ORDER
========================================================= */

const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (
      order.orderStatus === "Delivered" ||
      order.orderStatus === "Cancelled"
    ) {
      return res.status(400).json({
        success: false,
        message: "This order cannot be cancelled.",
      });
    }

    order.orderStatus = "Cancelled";

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully.",
      order,
    });
  } catch (error) {
    console.error("❌ CANCEL ORDER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel order.",
    });
  }
};

/* =========================================================
   UPDATE ORDER STATUS — ADMIN
========================================================= */

const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = [
      "Pending",
      "Confirmed",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ];

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Order status is required.",
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status.",
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    order.orderStatus = status;

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully.",
      order,
    });
  } catch (error) {
    console.error("❌ UPDATE ORDER STATUS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update order status.",
    });
  }
};

/* =========================================================
   EXPORTS
========================================================= */

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
};