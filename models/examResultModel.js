const mongoose = require("mongoose");

const examResultSchema = new mongoose.Schema(
  {
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "exam",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "student",
      required: true,
    },
    marksObtained: {
      type: Number,
      required: true,
      min: 0,
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 1,
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    grade: {
      type: String,
      required: true,
    },
    remarks: String,
    isAbsent: {
      type: Boolean,
      default: false,
    },
    // submittedBy: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "teacher",
    //   required: true,
    // },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique exam result per student per exam
examResultSchema.index({ exam: 1, student: 1 }, { unique: true });

// Index for efficient querying
examResultSchema.index({ student: 1, exam: 1 });
examResultSchema.index({ exam: 1 });

module.exports = mongoose.model("examResult", examResultSchema); 