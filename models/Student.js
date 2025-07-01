const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  studentId: {
    required: true,
    type: String,
    unique: true,
  },
  password: {
    required: true,
    type: String,
  },
  name: {
    required: true,
    type: String,
  },
  class: {
    required: true,
    type: String,
  },
});

module.exports = mongoose.model("StudentAuth", studentSchema);
