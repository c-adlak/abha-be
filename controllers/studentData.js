const generateEnrollmentNumber = require("../utils/helperFunctions");
const { studentSchema } = require("../validations/studentValidation");
const Student = require("../models/studentData");

module.exports.createStudent = async (req, res) => {
  const { error, value } = studentSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      message: "Validation failed",
      errors: error.details.map((e) => e.message),
    });
  }
  try {
    const {
      firstName,
      middleName,
      lastName,
      gender,
      dob,
      bloodGroup,
      religion,
      caste,
      nationality,
      photoUrl,

      className,
      section,
      academicYear,
      admissionDate,
      rollNo,

      phone,
      email,

      address,
      father,
      mother,
      guardian,

      transportOpted,
      busRoute,
      pickupPoint,

      medicalConditions,
      status,
      remarks,
      documents,

      createdBy,
    } = value;

    const lastEnrollment = await Student.findOne()
      .sort({ enrollmentNo: -1 })
      .limit(1);
    console.log("Last Enrollment:", lastEnrollment);
    const currentEnrollment = lastEnrollment
      ? lastEnrollment.enrollmentNo
      : "ABHA05A000";
    const enrollmentNo = generateEnrollmentNumber(currentEnrollment);
    console.log("New Enrollment Number:", enrollmentNo);
    const admissionNo = "ADM" + Date.now();
    console.log("Admission Number:", admissionNo);
    const studentId = "STU" + Date.now();

    const newStudent = new Student({
      studentId,
      enrollmentNo,
      admissionNo,
      firstName,
      middleName,
      lastName,
      gender,
      dob,
      bloodGroup,
      religion,
      caste,
      nationality,
      photoUrl,

      className,
      section,
      academicYear,
      admissionDate,
      rollNo,

      phone,
      email,
      address,

      father,
      mother,
      guardian,

      transportOpted,
      busRoute,
      pickupPoint,

      medicalConditions,
      status,
      remarks,
      documents,

      createdBy,
    });
    const savedStudent = await newStudent.save();
    console.log("New Student Registered:", savedStudent);
    return res.status(201).json({
      message: "Student registered successfully",
      student: savedStudent,
    });
  } catch (error) {
    console.error("Error during student registration:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

module.exports.getAllStudents = async (req, res) => {
  try {
    const students = await Student.find().sort({ enrollmentNo: 1 });
    console.log("Fetched Students:", students);
    return res.status(200).json({
      message: "Students fetched successfully",
      students,
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

module.exports.getStudentById = async (req, res) => {
  const enrollNo = req.params.empNo;
  console.log("Fetching student with enrollment number:", enrollNo);
  try {
    if (!enrollNo) {
      return res.status(400).json({ message: "Enrollment number is required" });
    }
    const student = await Student.findOne({ enrollmentNo: enrollNo });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    console.log("Fetched Student:", student);
    return res.status(200).json({
      message: "Student fetched successfully",
      student,
    });
  } catch (error) {
    console.error("Error fetching student by ID:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

module.exports.updateStudent = async (req, res) => {
  const enrollNo = req.params.empNo;
  const { error, value } = studentSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error) {
    return res.status(400).json({
      message: "Validation failed",
      errors: error.details.map((e) => e.message),
    });
  }
  console.log("Updating student with enrollment number:", enrollNo);
  try {
    if (!enrollNo) {
      return res.status(400).json({ message: "Enrollment number is required" });
    }

    const student = await Student.findOneAndUpdate(
      { enrollmentNo: enrollNo },
      req.body,
      { new: true, runValidators: true }
    );
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    console.log("Updated Student:", student);
    return res.status(200).json({
      message: "Student updated successfully",
      student,
    });
  } catch (error) {
    console.error("Error updating student:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
