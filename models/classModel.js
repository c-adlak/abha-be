const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    section: {
      type: String,
      required: true,
      trim: true,
    },
    academicYear: {
      type: String,
      required: true,
    },
    classTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "teacher",
      required: true,
    },
    subjects: [{
      subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "subject",
        required: true,
      },
      teacher: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "teacher",
        required: true,
      },
      hoursPerWeek: {
        type: Number,
        required: true,
        min: 1,
      },
    }],
    students: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "student",
    }],
    room: {
      type: String,
      required: true,
    },
    schedule: {
      type: String,
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    createdBy: String,
    updatedBy: String,
  },
  {
    timestamps: true,
  }
);

// Compound index for unique class per academic year
classSchema.index({ name: 1, section: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model("class", classSchema); 