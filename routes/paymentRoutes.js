const express = require("express");
const router = express.Router();
const {
  createOrder,
  verifyAndRecordPayment,
  getTransactionHistory,
  processRefund,
} = require("../controllers/paymentController");

router.post("/create-order", createOrder);
router.post("/verify", verifyAndRecordPayment);
router.get("/transactions/:studentId", getTransactionHistory);
router.post("/refund", processRefund);

module.exports = router;
