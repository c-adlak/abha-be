const mongoose = require("mongoose");

const paymentTransactionSchema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true, unique: true },
    feeCollectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeeCollection",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "student",
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ["CASH", "CARD", "UPI", "BANK_TRANSFER", "CHEQUE", "ONLINE", "DD"],
      required: true,
    },
    paymentGateway: {
      type: String,
      enum: ["RAZORPAY", "STRIPE", "PAYU", "CASHFREE", "MANUAL"],
      required: true,
    },
    gatewayTransactionId: String,
    gatewayOrderId: String,
    paymentStatus: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "CANCELLED", "REFUNDED"],
      default: "PENDING",
    },
    paymentDate: { type: Date, default: Date.now },
    receiptUrl: String,
    refundDetails: {
      refundId: String,
      refundAmount: { type: Number, min: 0 },
      refundDate: Date,
      refundReason: String,
      refundStatus: {
        type: String,
        enum: ["PENDING", "SUCCESS", "FAILED"],
      },
    },
    chequeDetails: {
      chequeNumber: String,
      bankName: String,
      chequeDate: Date,
      clearanceStatus: {
        type: String,
        enum: ["PENDING", "CLEARED", "BOUNCED"],
      },
    },
    metadata: {
      type: Map,
      of: String,
    },
    processedBy: String,
    remarks: String,
  },
  { timestamps: true }
);

// Indexes
paymentTransactionSchema.index({ transactionId: 1 });
paymentTransactionSchema.index({ studentId: 1, paymentDate: -1 });
paymentTransactionSchema.index({ feeCollectionId: 1 });
paymentTransactionSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model("PaymentTransaction", paymentTransactionSchema);
