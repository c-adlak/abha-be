// Enrollment/admission number generation removed – scholarNumber will be provided
const { studentSchema } = require("../validations/studentValidation");
const Student = require("../models/studentData");
const FeeStructure = require("../models/feeStructure");
const Class = require("../models/classModel");
const FeeCollection = require("../models/feeCollection");
const bcrypt = require("bcryptjs");
const {
  generateRandomPassword,
  hashPassword,
} = require("../utils/passwordUtils");
const { parseCSV, processBulkStudentUpload } = require("../utils/csvUtils");
const fs = require("fs");

// module.exports.createStudent = async (req, res) => {
//   const { error, value } = studentSchema.validate(req.body, {
//     abortEarly: false,
//   });

//   if (error) {
//     return res.status(400).json({
//       message: "Validation failed",
//       errors: error.details.map((e) => e.message),
//     });
//   }
//   try {
//     const {
//       firstName,
//       middleName,
//       lastName,
//       gender,
//       dob,
//       bloodGroup,
//       religion,
//       caste,
//       nationality,
//       photoUrl,

//       className,
//       section,
//       academicYear,
//       admissionDate,
//       rollNo,

//       phone,
//       email,

//       address,
//       father,
//       mother,
//       guardian,

//       transportOpted,
//       busRoute,
//       pickupPoint,

//       medicalConditions,
//       status,
//       remarks,
//       documents,

//       createdBy,
//     } = value;

//     const lastEnrollment = await Student.findOne()
//       .sort({ enrollmentNo: -1 })
//       .limit(1);
//     console.log("Last Enrollment:", lastEnrollment);
//     const currentEnrollment = lastEnrollment
//       ? lastEnrollment.enrollmentNo
//       : "ABHA05A000";
//     const enrollmentNo = generateEnrollmentNumber(currentEnrollment);
//     console.log("New Enrollment Number:", enrollmentNo);
//     const admissionNo = "ADM" + Date.now();
//     console.log("Admission Number:", admissionNo);
//     const studentId = "STU" + Date.now();

//     const newStudent = new Student({
//       studentId,
//       enrollmentNo,
//       admissionNo,
//       firstName,
//       middleName,
//       lastName,
//       gender,
//       dob,
//       bloodGroup,
//       religion,
//       caste,
//       nationality,
//       photoUrl,

//       className,
//       section,
//       academicYear,
//       admissionDate,
//       rollNo,

//       phone,
//       email,
//       address,

//       father,
//       mother,
//       guardian,

//       transportOpted,
//       busRoute,
//       pickupPoint,

//       medicalConditions,
//       status,
//       remarks,
//       documents,

//       createdBy,
//     });
//     const savedStudent = await newStudent.save();
//     console.log("New Student Registered:", savedStudent);
//     return res.status(201).json({
//       message: "Student registered successfully",
//       student: savedStudent,
//     });
//   } catch (error) {
//     console.error("Error during student registration:", error);
//     return res
//       .status(500)
//       .json({ message: "Internal server error", error: error.message });
//   }
// };

module.exports.createStudent = async (req, res) => {
  console.log("Received student data:", JSON.stringify(req.body, null, 2));

  const { error, value } = studentSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    console.log("Validation errors:", error.details);
    console.log(
      "Validation error details:",
      error.details.map((e) => ({
        field: e.path.join("."),
        message: e.message,
        type: e.type,
      }))
    );
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
      scholarNumber,
    } = value;

    console.log("Validated data:", {
      firstName,
      lastName,
      className,
      section,
      academicYear,
      admissionDate,
      dob,
      father: father?.name,
      mother: mother?.name,
    });

    // Ensure target class exists before creating student
    const targetClass = await Class.findOne({ name: className, section, academicYear });
    if (!targetClass) {
      return res.status(400).json({
        message: "Class not found for the provided class, section and academic year",
        details: { className, section, academicYear }
      });
    }

    // Generate internal studentId only
    const studentId = "STU" + Date.now();

    // Generate random password
    const randomPassword = generateRandomPassword();
    const hashedPassword = await hashPassword(randomPassword);

    // Save student
    const newStudent = new Student({
      studentId,
      scholarNumber,
      password: hashedPassword,
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
      isFirstLogin: true, // Student must change password on first login
    });

    const savedStudent = await newStudent.save();

    // Link student to Class document
    try {
      const classDoc = targetClass;
      if (classDoc) {
        const alreadyInClass = classDoc.students.some(
          (id) => id.toString() === savedStudent._id.toString()
        );
        if (!alreadyInClass) {
          classDoc.students.push(savedStudent._id);
          await classDoc.save();
        }
      } else {
        console.warn(
          `Class not found for student ${savedStudent.scholarNumber}: ${className}-${section} (${academicYear})`
        );
      }
    } catch (linkErr) {
      console.error("Error linking student to class:", linkErr);
    }

    // Auto-assign fee collection if fee structure exists for class/year
    try {
      const feeStructure = await FeeStructure.findOne({
        academicYear,
        class: className,
        isActive: true,
      });
      if (feeStructure) {
        const existing = await FeeCollection.findOne({ studentId: savedStudent._id, academicYear });
        if (!existing) {
          const now = new Date();
          const totalAmount = feeStructure.feeComponents.reduce((sum, c) => {
            let mult = 1;
            if (c.frequency === 'MONTHLY') mult = 12;
            else if (c.frequency === 'QUARTERLY') mult = 4;
            return sum + (c.amount * mult);
          }, 0);
          const newFeeCollection = new FeeCollection({
            receiptNumber: "RCPT" + Date.now(),
            studentId: savedStudent._id,
            academicYear,
            term: 'ANNUAL',
            feeComponents: feeStructure.feeComponents.map(c => ({
              componentName: c.componentName,
              amount: c.amount,
              dueDate: new Date(now.getFullYear(), now.getMonth(), c.dueDate),
              isPaid: false,
            })),
            totalAmount,
            paidAmount: 0,
            pendingAmount: totalAmount,
            paymentStatus: 'PENDING',
            dueDate: new Date(now.getFullYear(), now.getMonth(), 15),
            isActive: true,
          });
          await newFeeCollection.save();
        }
      }
    } catch (feeErr) {
      console.error('Auto-assign fee collection failed:', feeErr);
    }

    // Ensure at least one fee collection exists (avoid duplicate if already auto-assigned above)
    try {
      const existsCollection = await FeeCollection.findOne({ studentId: savedStudent._id, academicYear });
      if (!existsCollection) {
        const feeStructure = await FeeStructure.findOne({ academicYear, class: className, isActive: true });
        if (!feeStructure) {
          console.warn("Fee structure not found for student", scholarNumber);
        } else {
          const now = new Date();
          const feeComponents = feeStructure.feeComponents.map((component) => ({
            componentName: component.componentName,
            amount: component.amount,
            dueDate: new Date(now.getFullYear(), now.getMonth(), component.dueDate || 15),
            isPaid: false,
          }));
          const totalAmount = feeComponents.reduce((sum, fc) => sum + fc.amount, 0);
          const newFeeCollection = new FeeCollection({
            receiptNumber: "RCPT" + Date.now(),
            studentId: savedStudent._id,
            academicYear,
            feeComponents,
            totalAmount,
            paidAmount: 0,
            pendingAmount: totalAmount,
            paymentStatus: "PENDING",
            dueDate: new Date(now.getFullYear(), now.getMonth(), 15),
          });
          await newFeeCollection.save();
          console.log("FeeCollection created for student:", scholarNumber);
        }
      }
    } catch (fcErr) {
      console.error('Ensuring initial fee collection failed:', fcErr);
    }

    return res.status(201).json({
      message: "Student registered successfully with fee collection",
      student: savedStudent,
      defaultPassword: randomPassword, // Return the random password for admin reference
    });
  } catch (error) {
    console.error("Error during student registration:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
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
  const enrollNo = req.params.enrollNo;
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
  const enrollNo = req.params.enrollNo;
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
    console.log(req.body, "request body");

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

// Get student profile (for authenticated student)
module.exports.getStudentProfile = async (req, res) => {
  try {
    console.log("getStudentProfile called");
    console.log("req.user:", req.user);

    // req.user is set by the authenticateToken middleware
    const studentId = req.user.id;
    console.log("Looking for student with ID:", studentId);

    const student = await Student.findById(studentId);
    console.log("Found student:", student ? "Yes" : "No");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    console.log(
      "Returning student profile for:",
      student.firstName,
      student.lastName
    );
    return res.status(200).json({
      message: "Student profile fetched successfully",
      student,
    });
  } catch (error) {
    console.error("Error fetching student profile:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// Bulk upload students from CSV
module.exports.bulkUploadStudents = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "CSV file is required",
      });
    }

    // Parse and process the CSV file
    const parsedRows = await parseCSV(req.file.path);
    const csvData = await processBulkStudentUpload(parsedRows);

    if (csvData.errors.length > 0) {
      return res.status(400).json({
        message: "CSV validation failed",
        errors: csvData.errors,
        total: csvData.total,
      });
    }

    // Save valid students to database
    const savedStudents = [];
    const failedStudents = [];

    for (const studentData of csvData.success) {
      try {
        // Check if student already exists
        const existingStudent = await Student.findOne({
          $or: [
            { scholarNumber: studentData.data.scholarNumber },
            { email: studentData.data.email },
          ],
        });

        if (existingStudent) {
          failedStudents.push({
            row: studentData.row,
            reason: "Student already exists",
            data: studentData.data,
          });
          continue;
        }

        // Ensure class exists
        const existsClass = await Class.findOne({
          name: studentData.data.className,
          section: studentData.data.section,
          academicYear: studentData.data.academicYear,
        });
        if (!existsClass) {
          failedStudents.push({
            row: studentData.row,
            reason: "Class not found for the provided class, section and academic year",
            data: studentData.data,
          });
          continue;
        }

        // Remove incomplete parent/guardian subdocuments to avoid validation errors
        const sanitizedData = { ...studentData.data };
        const pruneIncompleteSubdoc = (obj, key) => {
          if (!obj[key]) return;
          const sub = obj[key] || {};
          if (!sub.name || !sub.phone || !sub.relation) {
            delete obj[key];
          }
        };
        pruneIncompleteSubdoc(sanitizedData, "father");
        pruneIncompleteSubdoc(sanitizedData, "mother");
        pruneIncompleteSubdoc(sanitizedData, "guardian");

        // Save student
        const newStudent = new Student(sanitizedData);
        const savedStudent = await newStudent.save();

        // Link student to Class document
        try {
          const classDoc = await Class.findOne({
            name: studentData.data.className,
            section: studentData.data.section,
            academicYear: studentData.data.academicYear,
          });
          if (classDoc) {
            const alreadyInClass = classDoc.students.some(
              (id) => id.toString() === savedStudent._id.toString()
            );
            if (!alreadyInClass) {
              classDoc.students.push(savedStudent._id);
              await classDoc.save();
            }
          } else {
            console.warn(
              `Class not found for bulk student ${savedStudent.enrollmentNo}: ${studentData.data.className}-${studentData.data.section} (${studentData.data.academicYear})`
            );
          }
        } catch (linkErr) {
          console.error("Error linking bulk student to class:", linkErr);
        }

        // Generate fee collection
        const feeStructure = await FeeStructure.findOne({
          academicYear: studentData.data.academicYear,
          class: studentData.data.className,
          isActive: true,
        });

        if (feeStructure) {
          const feeComponents = feeStructure.feeComponents.map((component) => ({
            componentName: component.componentName,
            amount: component.amount,
            dueDate: new Date(),
            isPaid: false,
          }));

          const totalAmount = feeComponents.reduce(
            (sum, fc) => sum + fc.amount,
            0
          );

          const newFeeCollection = new FeeCollection({
            receiptNumber: "RCPT" + Date.now(),
            studentId: savedStudent._id,
            academicYear: studentData.data.academicYear,
            feeComponents,
            totalAmount,
            paidAmount: 0,
            pendingAmount: totalAmount,
            paymentStatus: "PENDING",
            dueDate: new Date(),
          });

          await newFeeCollection.save();
        }

        savedStudents.push({
          row: studentData.row,
          student: savedStudent,
          password: studentData.data._plainPassword,
        });
      } catch (error) {
        failedStudents.push({
          row: studentData.row,
          reason: error.message,
          data: studentData.data,
        });
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Prepare login credentials for export
    const credentials = savedStudents.map((saved) => ({
      identifier: saved.student.scholarNumber,
      password: saved.password,
      name: `${saved.student.firstName} ${saved.student.lastName}`,
      class: saved.student.className,
      section: saved.student.section,
    }));

    return res.status(200).json({
      message: "Bulk upload completed",
      total: csvData.total,
      successful: savedStudents.length,
      failed: failedStudents.length,
      savedStudents,
      failedStudents,
      credentials, // Add credentials for frontend export
    });
  } catch (error) {
    console.error("Error during bulk upload:", error);

    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error("Error deleting uploaded file:", unlinkError);
      }
    }

    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Change password (for first login)
module.exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const studentId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      student.password
    );
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password and first login flag
    await Student.findByIdAndUpdate(studentId, {
      password: hashedNewPassword,
      isFirstLogin: false,
      passwordChangedAt: new Date(),
    });

    return res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get student dashboard data
module.exports.getStudentDashboard = async (req, res) => {
  try {
    const studentId = req.user.id;

    // Find the student
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        message: "Student not found",
      });
    }

    // Get current date for filtering
    const today = new Date();

    // Get student's class information
    const studentClass = await Class.findOne({
      name: student.className,
      section: student.section,
      academicYear: student.academicYear,
    })
      .populate("subjects.subject")
      .populate("subjects.teacher");

    // Get upcoming exams for student's class
    const Exam = require("../models/examModel");
    const upcomingExams = await Exam.find({
      class: studentClass?._id,
      examDate: { $gte: today },
      status: "Scheduled",
    })
      .populate("subject")
      .sort({ examDate: 1 })
      .limit(5);

    // Get recent attendance
    const Attendance = require("../models/attendanceModel");
    const attendanceRecords = await Attendance.find({
      studentId: studentId,
      academicYear: student.academicYear,
    })
      .sort({ date: -1 })
      .limit(30);

    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(
      (record) => record.status === "Present"
    ).length;
    const attendancePercentage =
      totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    // Get pending fees
    const pendingFees = await FeeCollection.findOne({
      studentId: studentId,
      academicYear: student.academicYear,
      status: "Pending",
    });

    // Get today's timetable
    const Timetable = require("../models/timetableModel");
    const timetable = await Timetable.findOne({
      class: studentClass?._id,
      academicYear: student.academicYear,
    })
      .populate("schedule.Monday.subject schedule.Monday.teacher")
      .populate("schedule.Tuesday.subject schedule.Tuesday.teacher")
      .populate("schedule.Wednesday.subject schedule.Wednesday.teacher")
      .populate("schedule.Thursday.subject schedule.Thursday.teacher")
      .populate("schedule.Friday.subject schedule.Friday.teacher")
      .populate("schedule.Saturday.subject schedule.Saturday.teacher");

    // Get today's schedule
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const todayName = dayNames[today.getDay()];
    const todaySchedule = timetable?.schedule[todayName] || [];

    const dashboardData = {
      upcomingExams: upcomingExams.map((exam) => ({
        subject: exam.subject?.name || "Unknown",
        date: exam.examDate,
        time: exam.startTime,
        type: exam.examType,
        room: exam.room,
      })),
      recentAttendance: {
        percentage: attendancePercentage,
        totalDays: totalDays,
        presentDays: presentDays,
      },
      pendingFees: pendingFees
        ? {
            amount: pendingFees.amount,
            dueDate: pendingFees.dueDate,
          }
        : { amount: 0 },
      todayTimetable: todaySchedule.map((period) => ({
        time: period.time,
        subject: period.subject?.name || "Unknown",
        teacher: period.teacher?.name || "Unknown",
        room: period.room,
      })),
      announcements: [], // Can be implemented later
    };

    return res.status(200).json(dashboardData);
  } catch (error) {
    console.error("Error fetching student dashboard:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};
