// controllers/feeController.js
const FeeCollection = require("../models/feeCollection");
const FeeStructure = require("../models/feeStructure");
const Student = require("../models/Student");
const PaymentTransaction = require("../models/paymentTransaction");
const {
  generateReceiptNumber,
  generateTransactionId,
} = require("../utils/receiptGenerator");
const {
  calculateLateFee,
  calculateDiscount,
} = require("../utils/feeCalculator");

// ================================
// GET STUDENT FEE DETAILS
// ================================
const getStudentFeeDetails = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear } = req.query;

    // Validate student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Get fee collections for the student
    const feeCollections = await FeeCollection.find({
      studentId,
      ...(academicYear && { academicYear }),
      isActive: true,
    }).sort({ dueDate: 1 });

    // Get payment history
    const paymentHistory = await PaymentTransaction.find({
      studentId,
      paymentStatus: "SUCCESS",
    }).sort({ paymentDate: -1 });

    // Calculate summary
    const totalDue = feeCollections.reduce(
      (sum, fee) => sum + fee.pendingAmount,
      0
    );
    const totalPaid = paymentHistory.reduce(
      (sum, payment) => sum + payment.amount,
      0
    );
    const overdueAmount = feeCollections
      .filter((fee) => fee.dueDate < new Date() && fee.paymentStatus !== "PAID")
      .reduce((sum, fee) => sum + fee.pendingAmount, 0);

    res.status(200).json({
      success: true,
      data: {
        student: {
          name: `${student.firstName} ${student.lastName}`,
          studentId: student.studentId,
          class: student.class,
          section: student.section,
        },
        summary: {
          totalDue,
          totalPaid,
          overdueAmount,
          nextDueDate: feeCollections.find(
            (fee) => fee.paymentStatus !== "PAID"
          )?.dueDate,
        },
        feeCollections,
        paymentHistory: paymentHistory.slice(0, 10), // Last 10 transactions
      },
    });
  } catch (error) {
    console.error("Error fetching student fee details:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ================================
// CREATE FEE COLLECTION FOR STUDENT
// ================================
const createFeeCollection = async (req, res) => {
  try {
    const { studentId, academicYear, feeComponents, dueDate, discount } =
      req.body;

    // Validate student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Check if fee collection already exists for this period
    const existingFee = await FeeCollection.findOne({
      studentId,
      academicYear,
      "feeComponents.componentName": {
        $in: feeComponents.map((fc) => fc.componentName),
      },
    });

    if (existingFee) {
      return res.status(400).json({
        success: false,
        message: "Fee collection already exists for this period",
      });
    }

    // Calculate total amount
    const totalAmount = feeComponents.reduce(
      (sum, component) => sum + component.amount,
      0
    );
    const discountAmount = discount?.amount || 0;
    const finalAmount = totalAmount - discountAmount;

    // Generate receipt number
    const receiptNumber = generateReceiptNumber();

    // Create fee collection
    const feeCollection = new FeeCollection({
      receiptNumber,
      studentId,
      academicYear,
      feeComponents,
      totalAmount: finalAmount,
      pendingAmount: finalAmount,
      dueDate,
      discount,
      paymentStatus: "PENDING",
    });

    await feeCollection.save();

    res.status(201).json({
      success: true,
      message: "Fee collection created successfully",
      data: feeCollection,
    });
  } catch (error) {
    console.error("Error creating fee collection:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ================================
// INITIATE PAYMENT
// ================================
const initiatePayment = async (req, res) => {
  try {
    const { feeCollectionId, amount, paymentMethod, paymentGateway } = req.body;

    // Validate fee collection
    const feeCollection = await FeeCollection.findById(
      feeCollectionId
    ).populate("studentId");

    if (!feeCollection) {
      return res.status(404).json({
        success: false,
        message: "Fee collection not found",
      });
    }

    // Validate payment amount
    if (amount > feeCollection.pendingAmount) {
      return res.status(400).json({
        success: false,
        message: "Payment amount exceeds pending amount",
      });
    }

    // Generate transaction ID
    const transactionId = generateTransactionId();

    // Create payment transaction record
    const paymentTransaction = new PaymentTransaction({
      transactionId,
      feeCollectionId,
      studentId: feeCollection.studentId._id,
      amount,
      paymentMethod,
      paymentGateway,
      paymentStatus: "PENDING",
    });

    await paymentTransaction.save();

    // Prepare payment gateway payload
    let gatewayResponse = {};

    if (paymentGateway === "RAZORPAY") {
      // ================================
      // RAZORPAY INTEGRATION POINT
      // ================================
      /*
      const Razorpay = require('razorpay');
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });

      const order = await razorpay.orders.create({
        amount: amount * 100, // Amount in paise
        currency: 'INR',
        receipt: transactionId,
        payment_capture: 1
      });

      // Update transaction with gateway order ID
      paymentTransaction.gatewayOrderId = order.id;
      await paymentTransaction.save();

      gatewayResponse = {
        orderId: order.id,
        key: process.env.RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'School Management System',
        description: `Fee payment for ${feeCollection.studentId.firstName}`,
        prefill: {
          name: `${feeCollection.studentId.firstName} ${feeCollection.studentId.lastName}`,
          email: feeCollection.studentId.email,
          contact: feeCollection.studentId.phone
        }
      };
      */

      // PLACEHOLDER - Replace with actual Razorpay integration
      gatewayResponse = {
        message: "Integrate Razorpay SDK here",
        transactionId,
        amount,
        currency: "INR",
      };
    } else if (paymentGateway === "STRIPE") {
      // ================================
      // STRIPE INTEGRATION POINT
      // ================================
      /*
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100, // Amount in cents
        currency: 'inr',
        metadata: {
          transactionId,
          studentId: feeCollection.studentId._id.toString()
        }
      });

      // Update transaction with gateway payment intent ID
      paymentTransaction.gatewayTransactionId = paymentIntent.id;
      await paymentTransaction.save();

      gatewayResponse = {
        clientSecret: paymentIntent.client_secret,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
      };
      */

      // PLACEHOLDER - Replace with actual Stripe integration
      gatewayResponse = {
        message: "Integrate Stripe SDK here",
        transactionId,
        amount,
        currency: "INR",
      };
    }

    res.status(200).json({
      success: true,
      message: "Payment initiated successfully",
      data: {
        transactionId,
        paymentGateway,
        gatewayResponse,
      },
    });
  } catch (error) {
    console.error("Error initiating payment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ================================
// VERIFY AND COMPLETE PAYMENT
// ================================
const verifyPayment = async (req, res) => {
  try {
    const {
      transactionId,
      gatewayTransactionId,
      gatewaySignature, // For Razorpay
      paymentStatus,
    } = req.body;

    // Find the transaction
    const transaction = await PaymentTransaction.findOne({
      transactionId,
    }).populate("feeCollectionId");

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    let verificationResult = false;

    if (transaction.paymentGateway === "RAZORPAY") {
      // ================================
      // RAZORPAY VERIFICATION
      // ================================
      /*
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${transaction.gatewayOrderId}|${gatewayTransactionId}`)
        .digest('hex');
      
      verificationResult = expectedSignature === gatewaySignature;
      */

      // PLACEHOLDER - Implement actual verification
      verificationResult = paymentStatus === "SUCCESS";
    } else if (transaction.paymentGateway === "STRIPE") {
      // ================================
      // STRIPE VERIFICATION
      // ================================
      /*
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const paymentIntent = await stripe.paymentIntents.retrieve(gatewayTransactionId);
      verificationResult = paymentIntent.status === 'succeeded';
      */

      // PLACEHOLDER - Implement actual verification
      verificationResult = paymentStatus === "SUCCESS";
    }

    if (verificationResult) {
      // Update transaction status
      transaction.paymentStatus = "SUCCESS";
      transaction.gatewayTransactionId = gatewayTransactionId;
      transaction.paymentDate = new Date();
      await transaction.save();

      // Update fee collection
      const feeCollection = transaction.feeCollectionId;
      feeCollection.paidAmount += transaction.amount;
      feeCollection.pendingAmount -= transaction.amount;

      if (feeCollection.pendingAmount <= 0) {
        feeCollection.paymentStatus = "PAID";
      } else {
        feeCollection.paymentStatus = "PARTIAL";
      }

      await feeCollection.save();

      res.status(200).json({
        success: true,
        message: "Payment verified and processed successfully",
        data: {
          transactionId,
          amount: transaction.amount,
          paymentStatus: "SUCCESS",
          receiptNumber: feeCollection.receiptNumber,
        },
      });
    } else {
      // Payment verification failed
      transaction.paymentStatus = "FAILED";
      await transaction.save();

      res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ================================
// GET PAYMENT HISTORY
// ================================
const getPaymentHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    // Build query
    const query = { studentId };
    if (status) query.paymentStatus = status;

    // Get payments with pagination
    const payments = await PaymentTransaction.find(query)
      .populate("feeCollectionId", "receiptNumber academicYear")
      .sort({ paymentDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await PaymentTransaction.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ================================
// GENERATE FEE RECEIPT
// ================================
const generateFeeReceipt = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await PaymentTransaction.findOne({ transactionId })
      .populate("studentId")
      .populate("feeCollectionId");

    if (!transaction || transaction.paymentStatus !== "SUCCESS") {
      return res.status(404).json({
        success: false,
        message: "Valid transaction not found",
      });
    }

    // Generate receipt data
    const receiptData = {
      receiptNumber: transaction.feeCollectionId.receiptNumber,
      transactionId: transaction.transactionId,
      studentDetails: {
        name: `${transaction.studentId.firstName} ${transaction.studentId.lastName}`,
        studentId: transaction.studentId.studentId,
        class: transaction.studentId.class,
        section: transaction.studentId.section,
      },
      paymentDetails: {
        amount: transaction.amount,
        paymentDate: transaction.paymentDate,
        paymentMethod: transaction.paymentMethod,
        gatewayTransactionId: transaction.gatewayTransactionId,
      },
      feeDetails: transaction.feeCollectionId.feeComponents,
      academicYear: transaction.feeCollectionId.academicYear,
    };

    // Here you would typically generate a PDF receipt
    // For now, returning the receipt data
    res.status(200).json({
      success: true,
      message: "Receipt generated successfully",
      data: receiptData,
    });
  } catch (error) {
    console.error("Error generating receipt:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// ================================
// REFUND PAYMENT
// ================================
const refundPayment = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { refundAmount, refundReason } = req.body;

    const transaction = await PaymentTransaction.findOne({
      transactionId,
    }).populate("feeCollectionId");

    if (!transaction || transaction.paymentStatus !== "SUCCESS") {
      return res.status(400).json({
        success: false,
        message: "Transaction not eligible for refund",
      });
    }

    if (refundAmount > transaction.amount) {
      return res.status(400).json({
        success: false,
        message: "Refund amount cannot exceed transaction amount",
      });
    }

    // Process refund through payment gateway
    let refundResult = {};

    if (transaction.paymentGateway === "RAZORPAY") {
      // ================================
      // RAZORPAY REFUND
      // ================================
      /*
      const Razorpay = require('razorpay');
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });

      const refund = await razorpay.payments.refund(transaction.gatewayTransactionId, {
        amount: refundAmount * 100, // Amount in paise
        speed: 'normal'
      });

      refundResult = {
        refundId: refund.id,
        status: refund.status
      };
      */
    }

    // Update transaction with refund details
    transaction.paymentStatus = "REFUNDED";
    transaction.refundDetails = {
      refundId: refundResult.refundId || `REF${Date.now()}`,
      refundAmount,
      refundDate: new Date(),
      refundReason,
    };

    await transaction.save();

    // Update fee collection
    const feeCollection = transaction.feeCollectionId;
    feeCollection.paidAmount -= refundAmount;
    feeCollection.pendingAmount += refundAmount;
    feeCollection.paymentStatus =
      feeCollection.pendingAmount > 0 ? "PARTIAL" : "PAID";

    await feeCollection.save();

    res.status(200).json({
      success: true,
      message: "Refund processed successfully",
      data: {
        transactionId,
        refundAmount,
        refundId: transaction.refundDetails.refundId,
      },
    });
  } catch (error) {
    console.error("Error processing refund:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  getStudentFeeDetails,
  createFeeCollection,
  initiatePayment,
  verifyPayment,
  getPaymentHistory,
  generateFeeReceipt,
  refundPayment,
};
