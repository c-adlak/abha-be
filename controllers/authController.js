const Student = require("../models/studentData");
const Teacher = require("../models/teacherModel");
const Admin = require("../models/adminModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

module.exports.login = async (req, res) => {
  const { identifier, password } = req.body; // identifier is scholarNumber
  try {
    const student = await Student.findOne({
      scholarNumber: identifier,
    });
    if (!student) {
      return res.status(404).json({ message: "student not found" });
    }
    const isPasswordValid = await bcrypt.compare(password, student.password);
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
        middleName: student.middleName,
        lastName: student.lastName,
        enrollmentNo: student.enrollmentNo,
        scholarNumber: student.scholarNumber,
        className: student.className,
        section: student.section,
        rollNo: student.rollNo,
        academicYear: student.academicYear,
        gender: student.gender,
        dob: student.dob,
        bloodGroup: student.bloodGroup,
        phone: student.phone,
        email: student.email,
        address: student.address,
        father: student.father,
        mother: student.mother,
        admissionDate: student.admissionDate,
        user: "STUDENT",
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

module.exports.teacherLogin = async (req, res) => {
  const { enrollmentNo, password } = req.body;
  try {
    const teacher = await Teacher.findOne({ enrollmentNo });
    if (!teacher) {
      return res.status(404).json({ message: "teacher not found" });
    }
    const isPasswordValid = await bcrypt.compare(password, teacher.password);
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
        email: teacher.email,
        enrollmentNo: teacher.enrollmentNo,
        user: "TEACHER",
      },
    });
  } catch (error) {
    console.error("Error during login:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

module.exports.adminLogin = async (req, res) => {
  const { identifier, password, enrollmentNo: legacyEnrollmentNo } = req.body;
  const adminIdentifier = identifier || legacyEnrollmentNo; // support both payloads
  console.log("Admin login attempt:", { enrollmentNo: adminIdentifier, password: password ? "***" : "empty" });
  
  try {
    // Check if admin exists
    let admin = await Admin.findOne({ enrollmentNo: adminIdentifier });
    console.log("Admin found:", admin ? "Yes" : "No");
    
    // If admin doesn't exist and this is the default admin credentials, create it
    if (!admin && adminIdentifier === "admin@school.com") {
      console.log("Creating default admin...");
      const hashedPassword = await bcrypt.hash("admin123", 12);
      admin = await Admin.create({
        enrollmentNo: "admin@school.com",
        name: "System Administrator",
        email: "admin@school.com",
        password: hashedPassword,
        role: "admin"
      });
      console.log("✅ Default admin created successfully!");
    }
    
    if (!admin) {
      console.log("Admin not found, returning 404");
      return res.status(404).json({ message: "admin not found" });
    }
    
    console.log("Comparing password...");
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    console.log("Password valid:", isPasswordValid);
    
    // If password doesn't match and this is the default admin, reset the password
    if (!isPasswordValid && adminIdentifier === "admin@school.com" && password === "admin123") {
      console.log("Resetting admin password...");
      const hashedPassword = await bcrypt.hash("admin123", 12);
      admin.password = hashedPassword;
      await admin.save();
      console.log("Admin password reset successfully");
    } else if (!isPasswordValid) {
      console.log("Invalid password, returning 401");
      return res.status(401).json({ message: "Invalid password" });
    }
    
    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    
    console.log("Admin login successful");
    res.json({
      message: "Login successful",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        enrollmentNo: admin.enrollmentNo,
        user: "ADMIN",
      },
    });
  } catch (error) {
    console.error("Error during admin login:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
