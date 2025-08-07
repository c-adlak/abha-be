const Student = require("../models/studentData");
const Teacher = require("../models/teacherModel");
const Admin = require("../models/adminModel");
const bcrypt = require("bcryptjs");
function generateEnrollmentNumber(currentEnrollment = "ABHA05A000") {
  const schoolCode = currentEnrollment.slice(0, 4); // "ABHA"
  const classCode = currentEnrollment.slice(4, 6); // "05"
  const section = currentEnrollment[6]; // "A"
  const uniqueNumber = parseInt(currentEnrollment.slice(7), 10); // "023" -> 23

  const nextUniqueNumber = uniqueNumber + 1;

  const formattedNumber = String(nextUniqueNumber).padStart(3, "0");

  // Combine all parts
  const newEnrollment = `${schoolCode}${classCode}${section}${formattedNumber}`;

  return newEnrollment;
}

function generateEnrollmentNumberforTeacher(currentEnrollment = "ABHATEA000") {
  const schoolCode = currentEnrollment.slice(0, 4); // "ABHA"
  const classCode = currentEnrollment.slice(4, 7); // "TEA"
  const uniqueNumber = parseInt(currentEnrollment.slice(8), 10); // "023" -> 23

  const nextUniqueNumber = uniqueNumber + 1;

  const formattedNumber = String(nextUniqueNumber).padStart(3, "0");

  // Combine all parts
  const newEnrollment = `${schoolCode}${classCode}${formattedNumber}`;

  return newEnrollment;
}

async function setStudentPassword(enrollmentNo, plainPassword) {
  console.log("Setting password for enrollmentNo:", enrollmentNo);
  try {
    const student = await Student.findOne({ enrollmentNo: enrollmentNo });
    if (!student) {
      console.log("Student not found with enrollmentNo:", enrollmentNo);
      return;
    }
    // console.log("Student found:", student);
    if (student.password) {
      console.log("Password already set for this student.");
      return;
    }
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    student.password = hashedPassword;
    await student.save();
    console.log("Password set successfully for", enrollmentNo);
  } catch (error) {
    console.error("Error setting password:", error.message);
  }
}

async function setTeacherPassword(enrollmentNo, plainPassword) {
  console.log("Setting password for enrollmentNo:", enrollmentNo);
  try {
    const teacher = await Teacher.findOne({ enrollmentNo: enrollmentNo });
    if (!teacher) {
      // console.log("techer not found with enrollmentNo:", enrollmentNo);
      return;
    }
    // console.log("Student found:", teacher);
    if (teacher.password) {
      console.log("Password already set for this teacher.");
      return;
    }
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    teacher.password = hashedPassword;
    await teacher.save();
    console.log("Password set successfully for", enrollmentNo);
  } catch (error) {
    console.error("Error setting password:", error.message);
  }
}

async function createDefaultAdmin(enrollmentNo, plainPassword) {
  console.log("Creating default admin with enrollmentNo:", enrollmentNo);
  try {
    const existingAdmin = await Admin.findOne({ enrollmentNo: enrollmentNo });
    if (existingAdmin) {
      console.log("Admin already exists with enrollmentNo:", enrollmentNo);
      return;
    }
    
    const hashedPassword = await bcrypt.hash(plainPassword, 12);
    const admin = await Admin.create({
      enrollmentNo: enrollmentNo,
      name: "System Administrator",
      email: enrollmentNo,
      password: hashedPassword,
      role: "admin"
    });
    
    console.log("✅ Default admin created successfully!");
    console.log("📧 Login ID:", enrollmentNo);
    console.log("🔑 Password:", plainPassword);
    console.log("👤 Role: admin");
  } catch (error) {
    console.error("Error creating default admin:", error.message);
  }
}

module.exports = {
  setTeacherPassword,
  setStudentPassword,
  createDefaultAdmin,
  generateEnrollmentNumber,
  generateEnrollmentNumberforTeacher,
};
