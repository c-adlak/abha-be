const Student = require("../models/studentData");
const Teacher = require("../models/teacherModel");
const bycrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

module.exports.login = async (req, res) => {
  const { enrollmentNo, password } = req.body;
  try {
    const student = await Student.findOne({ enrollmentNo });
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
        firstName: student.firstName,
        lastName: student.lastName,
        enrollmentNo: student.enrollmentNo,
        class: student.className,
        user: "STUDENT",
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    return res
      .status(500)
      .json({ message: "Interval server error", error: error.message });
  }
};

module.exports.teacherLogin = async (req, res) => {
  const { enrollmentNo, password } = req.body;
  try {
    const teacher = await Teacher.findOne({ enrollmentNo });
    if (!teacher) {
      return res.status(404).json({ message: "teacher not found" });
    }
    const isPasswordValid = await bycrypt.compare(password, teacher.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password" });
    }
    const token = jwt.sign({ id: teacher._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({
      message: "Login successful",
      token,
      teacher: {
        id: teacher._id,
        // studentId: teacher.studentId,
        name: teacher.name,
        emial: teacher.email,
        enrollmentNo: teacher.enrollmentNo,
        user: "TEACHER",
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    return res
      .status(500)
      .json({ message: "Interval server error", error: error.message });
  }
};
