const Student = require("../models/studentData");
const FeeStructure = require("../models/feeStructure");
const FeeCollection = require("../models/feeCollection");
// const PaymentTransaction = require("../models/paymentTransaction");
const mongoose = require("mongoose");

exports.getFeeDetails = async (req, res) => {
  try {
    const { studentId } = req.params;
    console.log("Fetching fee details for studentId:", studentId);
    const student = await Student.findById(studentId);
    // console.log(student, "student  ------------------");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const feeStructure = await FeeStructure.findOne({
      academicYear: student.academicYear,
      class: student.className,
      isActive: true,
    });
    // console.log(feeStructure, "feeStructure  ------------------");

    if (!feeStructure) {
      return res.status(404).json({
        message: "Fee structure not found for this class and academic year",
      });
    }

    const feeCollections = await FeeCollection.find({
      studentId,
      isActive: true,
    }).sort({ dueDate: 1 });

    // console.log(feeCollections, "feeCollections  ------------------");

    // Calculate summary
    const totalFee = feeCollections.reduce(
      (sum, fee) => sum + fee.totalAmount,
      0
    );
    const totalPaid = feeCollections.reduce(
      (sum, fee) => sum + fee.paidAmount,
      0
    );
    const totalPending = feeCollections.reduce(
      (sum, fee) => sum + fee.pendingAmount,
      0
    );
    const totalLateFee = feeCollections.reduce(
      (sum, fee) => sum + fee.lateFee,
      0
    );

    res.json({
      student,
      feeStructure,
      feeCollections,
      summary: {
        totalFee,
        totalPaid,
        totalPending,
        totalLateFee,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching fee details", error: error.message });
  }
};

exports.generateFeeCollection = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { studentId, term, feeComponents, dueDate } = req.body;

    const student = await Student.findById(studentId).session(session);
    if (!student) {
      throw new Error("Student not found");
    }

    const totalAmount = feeComponents.reduce(
      (sum, component) => sum + component.amount,
      0
    );

    const feeCollection = new FeeCollection({
      studentId,
      academicYear: student.academicYear,
      term,
      feeComponents: feeComponents.map((comp) => ({
        ...comp,
        dueDate: new Date(comp.dueDate || dueDate),
      })),
      totalAmount,
      pendingAmount: totalAmount,
      dueDate: new Date(dueDate),
    });

    await feeCollection.save({ session });
    await session.commitTransaction();

    res.status(201).json(feeCollection);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({
      message: "Error generating fee collection",
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

exports.updateLateFees = async (req, res) => {
  try {
    const overdueCollections = await FeeCollection.find({
      dueDate: { $lt: new Date() },
      paymentStatus: { $in: ["PENDING", "PARTIAL"] },
      isActive: true,
    });

    const updates = [];
    const currentDate = new Date();

    for (const collection of overdueCollections) {
      const daysOverdue = Math.floor(
        (currentDate - collection.dueDate) / (1000 * 60 * 60 * 24)
      );
      const lateFeePerDay = 10; // ₹10 per day
      const calculatedLateFee = daysOverdue * lateFeePerDay;

      if (calculatedLateFee !== collection.lateFee) {
        updates.push({
          updateOne: {
            filter: { _id: collection._id },
            update: {
              lateFee: calculatedLateFee,
              paymentStatus: "OVERDUE",
            },
          },
        });
      }
    }

    if (updates.length > 0) {
      await FeeCollection.bulkWrite(updates);
    }

    res.json({
      message: `Updated late fees for ${updates.length} collections`,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating late fees", error: error.message });
  }
};
