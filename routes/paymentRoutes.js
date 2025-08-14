const express = require("express");
const router = express.Router();
const {
  createOrder,
  verifyAndRecordPayment,
  getTransactionHistory,
  processRefund,
} = require("../controllers/paymentController");
const { authenticateToken, requireAdmin } = require("../middleware/auth");

// Students can create orders and verify payments
router.post("/create-order", authenticateToken, createOrder);
router.post("/verify", authenticateToken, verifyAndRecordPayment);

// Students can view their own transaction history, admins can view any student's
router.get("/transactions/:studentId", authenticateToken, getTransactionHistory);

// Only admins can process refunds
router.post("/refund", authenticateToken, requireAdmin, processRefund);

module.exports = router;
