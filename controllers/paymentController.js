const crypto = require("crypto");
const PaymentTransaction = require("../models/paymentTransaction");
const FeeCollection = require("../models/feeCollection");
const Student = require("../models/studentData");
const { generateReceipt } = require("../utils/receiptGenerator");
const mongoose = require("mongoose");
const razorpay = require("../config/razorpay");

exports.createOrder = async (req, res) => {
  console.log(razorpay, "razorpay <");
  try {
    const { amount, receipt, studentId, feeCollectionId } = req.body;
    console.log("Creating order with data:", {
      amount,
      receipt,
      studentId,
      feeCollectionId,
    });
    // Validate student and fee collection
    const student = await Student.findById(studentId);
    console.log(student, "student <___________________________");
    const feeCollection = await FeeCollection.findById(feeCollectionId);
    console.log(feeCollection, "feeCollection <___________________________");
    if (!student || !feeCollection) {
      return res
        .status(404)
        .json({ message: "Student or fee collection not found" });
    }

    if (feeCollection.studentId.toString() !== studentId) {
      return res
        .status(400)
        .json({ message: "Fee collection does not belong to this student" });
    }

    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: "INR",
      receipt: receipt || `rcpt_${Date.now()}`,
      notes: {
        studentId: studentId,
        feeCollectionId: feeCollectionId,
        studentName: student.name,
      },
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error("Order creation error:", error);
    res
      .status(500)
      .json({ message: "Order creation failed", error: error.message });
  }
};

exports.verifyAndRecordPayment = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      studentId,
      feeCollectionId,
      amount,
    } = req.body;

    // Verify signature
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      throw new Error("Invalid payment signature");
    }

    // Check if transaction already exists
    const existingTransaction = await PaymentTransaction.findOne({
      gatewayTransactionId: razorpay_payment_id,
    }).session(session);

    if (existingTransaction) {
      throw new Error("Transaction already processed");
    }

    // Get fee collection
    const feeCollection = await FeeCollection.findById(feeCollectionId).session(
      session
    );
    if (!feeCollection) {
      throw new Error("Fee collection not found");
    }

    // Validate amount
    const expectedAmount = feeCollection.pendingAmount + feeCollection.lateFee;
    if (Math.abs(amount - expectedAmount) > 1) {
      // Allow ₹1 difference for rounding
      throw new Error("Payment amount mismatch");
    }

    // Create payment transaction
    const transaction = new PaymentTransaction({
      transactionId: razorpay_payment_id,
      feeCollectionId,
      studentId,
      amount,
      paymentMethod: "ONLINE",
      paymentGateway: "RAZORPAY",
      gatewayTransactionId: razorpay_payment_id,
      gatewayOrderId: razorpay_order_id,
      paymentStatus: "SUCCESS",
      paymentDate: new Date(),
    });

    await transaction.save({ session });

    // Update fee collection
    feeCollection.paidAmount += amount;
    feeCollection.pendingAmount = Math.max(
      0,
      feeCollection.totalAmount +
        feeCollection.lateFee -
        feeCollection.paidAmount
    );

    // Update component payment status
    let remainingAmount = amount;
    for (const component of feeCollection.feeComponents) {
      if (!component.isPaid && remainingAmount > 0) {
        const componentDue = component.amount - component.paidAmount;
        const paymentForComponent = Math.min(remainingAmount, componentDue);

        component.paidAmount += paymentForComponent;
        if (component.paidAmount >= component.amount) {
          component.isPaid = true;
          component.paidDate = new Date();
        }
        remainingAmount -= paymentForComponent;
      }
    }

    // Update overall status
    if (feeCollection.pendingAmount <= 0) {
      feeCollection.paymentStatus = "PAID";
    } else {
      feeCollection.paymentStatus = "PARTIAL";
    }

    await feeCollection.save({ session });

    // Generate receipt
    const receiptUrl = await generateReceipt(transaction, feeCollection);
    transaction.receiptUrl = receiptUrl;
    await transaction.save({ session });

    await session.commitTransaction();

    res.json({
      success: true,
      transaction,
      message: "Payment successful",
      receiptUrl,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Payment verification error:", error);
    res
      .status(400)
      .json({ message: "Payment verification failed", error: error.message });
  } finally {
    session.endSession();
  }
};

exports.getTransactionHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;

    const query = { studentId };

    if (status) query.paymentStatus = status;
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) query.paymentDate.$lte = new Date(endDate);
    }

    const transactions = await PaymentTransaction.find(query)
      .populate("feeCollectionId", "receiptNumber term academicYear")
      .populate("studentId", "name studentId class")
      .sort({ paymentDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await PaymentTransaction.countDocuments(query);

    res.json({
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching transaction history",
      error: error.message,
    });
  }
};

exports.processRefund = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { transactionId, refundAmount, refundReason } = req.body;

    const transaction = await PaymentTransaction.findById(
      transactionId
    ).session(session);
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    if (transaction.paymentStatus !== "SUCCESS") {
      throw new Error("Can only refund successful payments");
    }

    if (refundAmount > transaction.amount) {
      throw new Error("Refund amount cannot exceed transaction amount");
    }

    // Process refund with payment gateway
    const refund = await razorpay.payments.refund(
      transaction.gatewayTransactionId,
      {
        amount: refundAmount * 100,
        notes: {
          reason: refundReason,
        },
      }
    );

    // Update transaction
    transaction.paymentStatus = "REFUNDED";
    transaction.refundDetails = {
      refundId: refund.id,
      refundAmount,
      refundDate: new Date(),
      refundReason,
      refundStatus: "SUCCESS",
    };

    await transaction.save({ session });

    // Update fee collection
    const feeCollection = await FeeCollection.findById(
      transaction.feeCollectionId
    ).session(session);
    feeCollection.paidAmount -= refundAmount;
    feeCollection.pendingAmount += refundAmount;
    feeCollection.paymentStatus =
      feeCollection.paidAmount <= 0 ? "PENDING" : "PARTIAL";

    await feeCollection.save({ session });
    await session.commitTransaction();

    res.json({ success: true, refund, transaction });
  } catch (error) {
    await session.abortTransaction();
    res
      .status(400)
      .json({ message: "Refund processing failed", error: error.message });
  } finally {
    session.endSession();
  }
};
