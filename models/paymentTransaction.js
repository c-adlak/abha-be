const mongoose = require("mongoose");

const paymentTransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
    },
    feeCollectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeeCollection",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["CASH", "CARD", "UPI", "BANK_TRANSFER", "CHEQUE", "ONLINE"],
      required: true,
    },
    paymentGateway: {
      type: String,
      enum: ["RAZORPAY", "STRIPE", "PAYU", "CASHFREE", "MANUAL"],
      required: true,
    },
    gatewayTransactionId: String, // ID from payment gateway
    gatewayOrderId: String, // Order ID from payment gateway
    paymentStatus: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "CANCELLED", "REFUNDED"],
      default: "PENDING",
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    receiptUrl: String,
    refundDetails: {
      refundId: String,
      refundAmount: Number,
      refundDate: Date,
      refundReason: String,
    },
    metadata: {
      type: Map,
      of: String, // For storing additional gateway specific data
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
paymentTransactionSchema.index({ studentId: 1, paymentDate: -1 });
paymentTransactionSchema.index({ paymentStatus: 1 });
paymentTransactionSchema.index({ gatewayTransactionId: 1 });

module.exports = mongoose.model("PaymentTransaction", paymentTransactionSchema);
