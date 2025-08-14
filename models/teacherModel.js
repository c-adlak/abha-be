const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    enrollmentNo: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    contact: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    alternateContact: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
    dob: Date,
    address: {
      street: String,
      city: String,
      state: String,
      zip: String,
      country: String,
    },
    designation: String,
    department: String,
    joiningDate: Date,
    resignationDate: Date,
    status: {
      type: String,
      enum: ["Active", "Inactive", "On Leave", "Resigned", "Terminated"],
      default: "Active",
    },
    
    // Password Management
    isFirstLogin: { type: Boolean, default: true },
    passwordChangedAt: Date,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("teacher", teacherSchema);
