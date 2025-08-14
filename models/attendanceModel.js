const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "student",
      required: true,
    },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "class",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["Present", "Absent", "Late", "Half Day"],
      default: "Present",
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "teacher",
      required: true,
    },
    remarks: String,
    academicYear: {
      type: String,
      required: true,
    },
    month: {
      type: Number,
      required: true,
    },
    week: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
attendanceSchema.index({ studentId: 1, date: 1, classId: 1 }, { unique: true });
attendanceSchema.index({ classId: 1, date: 1 });
attendanceSchema.index({ studentId: 1, academicYear: 1 });

const Attendance = mongoose.models.attendance || mongoose.model("attendance", attendanceSchema);
module.exports = Attendance;
