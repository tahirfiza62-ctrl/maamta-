const express = require("express");

const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
} = require("../controllers/orderController");

const authMiddleware = require("../middleware/authMiddleware");
const optionalAuthMiddleware = require(
  "../middleware/optionalAuthMiddleware"
);

const router = express.Router();

// Guest COD and logged-in orders.
router.post("/", optionalAuthMiddleware, createOrder);

// These routes remain login-only.
router.get("/", authMiddleware, getMyOrders);
router.get("/:id", authMiddleware, getOrderById);
router.put("/:id/cancel", authMiddleware, cancelOrder);

module.exports = router;