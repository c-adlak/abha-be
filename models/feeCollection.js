const mongoose = require("mongoose");

const feeCollectionSchema = new mongoose.Schema({
  receiptNumber: { type: String, required: true, unique: true },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "student",
    required: true,
  },
  academicYear: String,
  term: { type: String },
  feeComponents: [
    {
      componentName: String,
      amount: Number,
      dueDate: Date,
      isPaid: { type: Boolean, default: false },
      paidAmount: { type: Number, default: 0 },
      paidDate: Date,
    },
  ],
  totalAmount: Number,
  paidAmount: { type: Number, default: 0 },
  pendingAmount: Number,
  paymentStatus: {
    type: String,
    enum: ["PENDING", "PARTIAL", "PAID", "OVERDUE"],
    default: "PENDING",
  },
  dueDate: Date,
  lateFee: { type: Number, default: 0 },
  discount: {
    amount: { type: Number, default: 0 },
    reason: String,
    appliedBy: String,
  },
  isActive: { type: Boolean, default: true },
});

feeCollectionSchema.index({ studentId: 1, academicYear: 1 });

module.exports = mongoose.model("FeeCollection", feeCollectionSchema);
