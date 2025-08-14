const Student = require("../models/studentData");
const FeeStructure = require("../models/feeStructure");
const FeeCollection = require("../models/feeCollection");
// const PaymentTransaction = require("../models/paymentTransaction");
const mongoose = require("mongoose");
const { parseCSV } = require("../utils/csvUtils");
const fs = require("fs");

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

// Admin: create or update fee structure per class/year
exports.upsertFeeStructure = async (req, res) => {
  try {
    const { academicYear, className, feeComponents, isActive = true } = req.body;
    if (!academicYear || !className || !Array.isArray(feeComponents) || feeComponents.length === 0) {
      return res.status(400).json({ message: "academicYear, className, and feeComponents are required" });
    }
    const mapped = feeComponents.map(c => ({
      componentName: c.componentName,
      amount: Number(c.amount),
      frequency: c.frequency,
      dueDate: Number(c.dueDate),
      isOptional: Boolean(c.isOptional),
      description: c.description || '',
    }));
    const doc = await FeeStructure.findOneAndUpdate(
      { academicYear, class: className },
      { academicYear, class: className, feeComponents: mapped, isActive },
      { new: true, upsert: true, runValidators: true }
    );
    return res.json({ message: "Fee structure saved", feeStructure: doc });
  } catch (error) {
    return res.status(500).json({ message: "Error saving fee structure", error: error.message });
  }
};

// Admin: bulk assign fee collections to all students of a class for the year
exports.assignFeesToClass = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { academicYear, className } = req.body;
    if (!academicYear || !className) {
      return res.status(400).json({ message: "academicYear and className are required" });
    }
    const feeStructure = await FeeStructure.findOne({ academicYear, class: className, isActive: true });
    if (!feeStructure) {
      return res.status(404).json({ message: "Fee structure not found for class/year" });
    }
    const students = await Student.find({ className, academicYear }).session(session);
    const now = new Date();
    for (const student of students) {
      // One collection per student aggregating all components (simple model)
      const totalAmount = feeStructure.feeComponents.reduce((sum, c) => {
        let multiplier = 1;
        switch (c.frequency) {
          case 'MONTHLY': multiplier = 12; break;
          case 'QUARTERLY': multiplier = 4; break;
          case 'ANNUALLY': multiplier = 1; break;
          default: multiplier = 1;
        }
        return sum + (c.amount * multiplier);
      }, 0);

      const existing = await FeeCollection.findOne({ studentId: student._id, academicYear }).session(session);
      if (existing) continue; // skip if already assigned

      await FeeCollection.create([{
        receiptNumber: `RCPT${Date.now()}${Math.floor(Math.random()*1000)}`,
        studentId: student._id,
        academicYear,
        term: 'ANNUAL',
        feeComponents: feeStructure.feeComponents.map(c => ({
          componentName: c.componentName,
          amount: c.amount,
          dueDate: new Date(now.getFullYear(), now.getMonth(), c.dueDate),
          isPaid: false,
        })),
        totalAmount,
        paidAmount: 0,
        pendingAmount: totalAmount,
        paymentStatus: 'PENDING',
        dueDate: new Date(now.getFullYear(), now.getMonth(), 15),
        isActive: true,
      }], { session });
    }
    await session.commitTransaction();
    return res.json({ message: `Fees assigned to ${students.length} students for class ${className}` });
  } catch (error) {
    await session.abortTransaction();
    return res.status(500).json({ message: "Error assigning fees", error: error.message });
  } finally {
    session.endSession();
  }
};

// Admin: bulk upload fee structures via CSV
exports.bulkUploadFeeStructure = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "CSV file is required" });
    }

    const rows = await parseCSV(req.file.path);
    const required = ["academicyear", "class", "componentname", "amount", "frequency", "dueday"]; 

    // normalize and group
    const sanitize = (s) => String(s || "").trim();
    const groupMap = new Map(); // key: year|class -> components[]

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const r = {};
      for (const [k, v] of Object.entries(raw)) {
        const key = String(k).toLowerCase().replace(/[^a-z0-9]/g, "");
        r[key] = sanitize(v);
      }
      const missing = required.filter((f) => !r[f]);
      if (missing.length) {
        continue; // skip invalid rows silently (or collect errors if needed)
      }
      const year = r.academicyear;
      const cls = r.class;
      const key = `${year}|${cls}`;
      const arr = groupMap.get(key) || [];
      arr.push({
        componentName: r.componentname,
        amount: Number(r.amount) || 0,
        frequency: (r.frequency || "ANNUALLY").toUpperCase(),
        dueDate: Number(r.dueday) || 1,
        isOptional: r.isoptional === "true" || r.isoptional === "1",
        description: r.description || "",
      });
      groupMap.set(key, arr);
    }

    let upserts = 0;
    for (const [key, components] of groupMap.entries()) {
      const [academicYear, className] = key.split("|");
      await FeeStructure.findOneAndUpdate(
        { academicYear, class: className },
        { academicYear, class: className, feeComponents: components, isActive: true },
        { upsert: true, new: true, runValidators: true }
      );
      upserts++;
    }

    try { fs.unlinkSync(req.file.path); } catch (_) {}
    return res.json({ message: "Bulk fee structure upload completed", updated: upserts });
  } catch (error) {
    // cleanup file
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    return res.status(500).json({ message: "Error processing CSV", error: error.message });
  }
};


//removal of the following
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
