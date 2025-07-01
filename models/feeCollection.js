const mongoose = require("mongoose");

const feeCollectionSchema = new mongoose.Schema(
  {
    receiptNumber: {
      type: String,
      required: true,
      unique: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
    },
    feeComponents: [
      {
        componentName: String,
        amount: Number,
        dueDate: Date,
        isPaid: {
          type: Boolean,
          default: false,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    pendingAmount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ["PENDING", "PARTIAL", "PAID", "OVERDUE"],
      default: "PENDING",
    },
    dueDate: {
      type: Date,
      required: true,
    },
    lateFee: {
      type: Number,
      default: 0,
    },
    discount: {
      amount: {
        type: Number,
        default: 0,
      },
      reason: String,
      appliedBy: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
feeCollectionSchema.index({ studentId: 1, academicYear: 1 });
feeCollectionSchema.index({ paymentStatus: 1 });
feeCollectionSchema.index({ dueDate: 1 });

module.exports = mongoose.model("FeeCollection", feeCollectionSchema);
