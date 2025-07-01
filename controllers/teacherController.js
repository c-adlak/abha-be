const generateEnrollmentNumberforTeacher = require("../utils/helperFunctions");
const { teacherValidationSchema } = require("../validations/teacherValidation");
const Teacher = require("../models/teacherModel");

module.exports.createTeacher = async (req, res) => {
  const { error, value } = teacherValidationSchema.validate(req.body, {
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
      name,
      email,
      contact,
      alternateContact,
      gender,
      dob,
      address,
      designation,
      joiningDate,
      status,
    } = value;

    const lastEnrollment = await Teacher.findOne()
      .sort({ enrollmentNo: -1 })
      .limit(1);
    console.log("Last Enrollment:", lastEnrollment);
    const currentEnrollment = lastEnrollment
      ? lastEnrollment.enrollmentNo
      : "ABHATEA000";
    const enrollmentNo = generateEnrollmentNumberforTeacher(currentEnrollment);
    console.log("New Enrollment Number:", enrollmentNo);
    // const admissionNo = "ADM" + Date.now();
    // console.log("Admission Number:", admissionNo);
    // const studentId = "STU" + Date.now();

    const newTeacher = new Teacher({
      enrollmentNo,
      name,
      email,
      contact,
      alternateContact,
      gender,
      dob,
      address,
      designation,
      joiningDate,
      status,
    });
    const savedTeacher = await newTeacher.save();
    console.log("New Student Registered:", savedTeacher);
    return res.status(201).json({
      message: "Teacher registered successfully",
      student: savedTeacher,
    });
  } catch (error) {
    console.error("Error during Teacher registration:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

module.exports.getAllTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find().sort({ enrollmentNo: 1 });
    console.log("Fetched teachers:", teachers);
    return res.status(200).json({
      message: "teachers fetched successfully",
      teachers,
    });
  } catch (error) {
    console.error("Error fetching teachers:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

module.exports.getTeacherById = async (req, res) => {
  const empNo = req.params.enrollNo;
  console.log("Fetching student with enrollment number:", empNo);
  try {
    if (!empNo) {
      return res.status(400).json({ message: "Enrollment number is required" });
    }
    const teacher = await Teacher.findOne({ enrollmentNo: empNo });
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    console.log("Fetched teacher:", teacher);
    return res.status(200).json({
      message: "Teacher fetched successfully",
      teacher,
    });
  } catch (error) {
    console.error("Error fetching teacher by ID:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

module.exports.updateTeacher = async (req, res) => {
  const enrollNo = req.params.empNo;
  const { error, value } = teacherValidationSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error) {
    return res.status(400).json({
      message: "Validation failed",
      errors: error.details.map((e) => e.message),
    });
  }
  console.log("Updating teacher with enrollment number:", enrollNo);
  try {
    if (!enrollNo) {
      return res.status(400).json({ message: "Enrollment number is required" });
    }

    const teacher = await Teacher.findOneAndUpdate(
      { enrollmentNo: enrollNo },
      req.body,
      { new: true, runValidators: true }
    );
    if (!teacher) {
      return res.status(404).json({ message: "teacher not found" });
    }
    console.log("Updated teacher:", teacher);
    return res.status(200).json({
      message: "teacher updated successfully",
      teacher,
    });
  } catch (error) {
    console.error("Error updating teacher:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
