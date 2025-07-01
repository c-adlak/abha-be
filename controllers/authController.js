const Student = require("../models/Student");
const bycrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

module.exports.login = async (req, res) => {
  const { studentId, password } = req.body;
  try {
    const student = await Student.findOne({ studentId });
    if (!student) {
      return res.status(404).json({ message: "student not found" });
    }
    const isPasswordValid = await bycrypt.compare(password, student.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }
    const token = jwt.sign({ id: student._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({
      message: "Login successful",
      token,
      student: {
        id: student._id,
        studentId: student.studentId,
        name: student.name,
        class: student.class,
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    return res
      .status(500)
      .json({ message: "Interval server error", error: error.message });
  }
};
