const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "subject",
      required: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "class",
      required: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "teacher",
      required: false, // Made optional
    },
    examDate: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    duration: {
      type: Number, // in minutes
      required: true,
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 1,
    },
    room: {
      type: String,
      required: true,
    },
    examType: {
      type: String,
      enum: ["Unit Test", "Mid Term", "Final Term", "Practical", "Assignment"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Cancelled"],
      default: "Scheduled",
    },
    instructions: String,
    createdBy: String,
    updatedBy: String,
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
examSchema.index({ class: 1, examDate: 1 });
examSchema.index({ subject: 1, examDate: 1 });

module.exports = mongoose.model("exam", examSchema); 