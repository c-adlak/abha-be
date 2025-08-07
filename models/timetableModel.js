const mongoose = require("mongoose");

const timetableSchema = new mongoose.Schema(
  {
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "class",
      required: true,
    },
    academicYear: {
      type: String,
      required: true,
    },
    schedule: {
      Monday: [{
        time: {
          type: String,
          required: true,
        },
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
        room: {
          type: String,
          required: true,
        },
      }],
      Tuesday: [{
        time: {
          type: String,
          required: true,
        },
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
        room: {
          type: String,
          required: true,
        },
      }],
      Wednesday: [{
        time: {
          type: String,
          required: true,
        },
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
        room: {
          type: String,
          required: true,
        },
      }],
      Thursday: [{
        time: {
          type: String,
          required: true,
        },
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
        room: {
          type: String,
          required: true,
        },
      }],
      Friday: [{
        time: {
          type: String,
          required: true,
        },
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
        room: {
          type: String,
          required: true,
        },
      }],
      Saturday: [{
        time: {
          type: String,
          required: true,
        },
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
        room: {
          type: String,
          required: true,
        },
      }],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: String,
    updatedBy: String,
  },
  {
    timestamps: true,
  }
);

// Compound index for unique timetable per class per academic year
timetableSchema.index({ class: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model("timetable", timetableSchema); 