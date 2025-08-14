const {
  generateEnrollmentNumberforTeacher,
} = require("../utils/helperFunctions");
const { teacherValidationSchema } = require("../validations/teacherValidation");
const Teacher = require("../models/teacherModel");
const bcrypt = require("bcryptjs");
const { generateRandomPassword, hashPassword } = require("../utils/passwordUtils");
const fs = require('fs');
const csv = require('csv-parser');

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
      department,
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

    // Generate random password
    const randomPassword = generateRandomPassword();
    const hashedPassword = await hashPassword(randomPassword);

    const newTeacher = new Teacher({
      enrollmentNo,
      password: hashedPassword,
      name,
      email,
      contact,
      alternateContact,
      gender,
      dob,
      address,
      designation,
      department,
      joiningDate,
      status,
      isFirstLogin: true, // Teacher must change password on first login
    });
    const savedTeacher = await newTeacher.save();
    console.log("New Teacher Registered:", savedTeacher);
    return res.status(201).json({
      message: "Teacher registered successfully",
      teacher: savedTeacher,
      defaultPassword: randomPassword, // Return the random password for admin reference
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
  const enrollNo = req.params.enrollNo;
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

// Get teacher profile (for authenticated teacher)
module.exports.getTeacherProfile = async (req, res) => {
  try {
    // req.user is set by the authenticateToken middleware
    const teacherId = req.user.id;
    
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }
    
    return res.status(200).json({
      message: "Teacher profile fetched successfully",
      teacher,
    });
  } catch (error) {
    console.error("Error fetching teacher profile:", error);
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// Change password (for first login)
module.exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const teacherId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required"
      });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        message: "Teacher not found"
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, teacher.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        message: "Current password is incorrect"
      });
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password and first login flag
    await Teacher.findByIdAndUpdate(teacherId, {
      password: hashedNewPassword,
      isFirstLogin: false,
      passwordChangedAt: new Date()
    });

    return res.status(200).json({
      message: "Password changed successfully"
    });

  } catch (error) {
    console.error("Error changing password:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update teacher resignation status
module.exports.updateResignationStatus = async (req, res) => {
  try {
    const { enrollmentNo } = req.params;
    const { status, resignationDate } = req.body;

    if (!status || !['Active', 'Inactive', 'On Leave', 'Resigned', 'Terminated'].includes(status)) {
      return res.status(400).json({
        message: "Valid status is required"
      });
    }

    const updateData = { status };
    
    if (status === 'Resigned' || status === 'Terminated') {
      if (!resignationDate) {
        return res.status(400).json({
          message: "Resignation date is required when status is Resigned or Terminated"
        });
      }
      updateData.resignationDate = new Date(resignationDate);
    }

    const teacher = await Teacher.findOneAndUpdate(
      { enrollmentNo },
      updateData,
      { new: true, runValidators: true }
    );

    if (!teacher) {
      return res.status(404).json({
        message: "Teacher not found"
      });
    }

    return res.status(200).json({
      message: "Teacher status updated successfully",
      teacher
    });

  } catch (error) {
    console.error("Error updating teacher resignation status:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Bulk upload teachers from CSV
module.exports.bulkUploadTeachers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "CSV file is required"
      });
    }

    const results = [];
    const credentials = [];
    let successCount = 0;
    let errorCount = 0;

    // Parse CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          for (const row of results) {
            try {
              // Check if teacher already exists
              const existingTeacher = await Teacher.findOne({
                $or: [
                  { enrollmentNo: row['Enrollment No'] },
                  { email: row['Email'] }
                ]
              });

              if (existingTeacher) {
                errorCount++;
                continue;
              }

              // Generate random password
              const randomPassword = generateRandomPassword();
              const hashedPassword = await hashPassword(randomPassword);

              // Create teacher object
              const teacherData = {
                name: `${row['First Name']} ${row['Last Name']}`,
                email: row['Email'],
                contact: row['Contact'],
                alternateContact: row['Alternate Contact'],
                gender: row['Gender'],
                dob: new Date(row['Date of Birth']),
                address: {
                  street: row['Street Address'],
                  city: row['City'],
                  state: row['State'],
                  postalCode: row['Postal Code'],
                  country: row['Country']
                },
                designation: row['Designation'],
                department: row['Department'],
                joiningDate: new Date(row['Joining Date']),
                status: row['Status'] || 'Active',
                password: hashedPassword,
                isFirstLogin: true
              };

              // Generate enrollment number
              const lastEnrollment = await Teacher.findOne()
                .sort({ enrollmentNo: -1 })
                .limit(1);
              const currentEnrollment = lastEnrollment
                ? lastEnrollment.enrollmentNo
                : "ABHATEA000";
              teacherData.enrollmentNo = generateEnrollmentNumberforTeacher(currentEnrollment);

              // Save teacher
              const newTeacher = new Teacher(teacherData);
              const savedTeacher = await newTeacher.save();

              // Add to credentials for export
              credentials.push({
                identifier: savedTeacher.enrollmentNo,
                password: randomPassword,
                name: savedTeacher.name,
                department: savedTeacher.department
              });

              successCount++;
            } catch (error) {
              console.error(`Error processing row:`, error);
              errorCount++;
            }
          }

          // Clean up uploaded file
          fs.unlinkSync(req.file.path);

          return res.status(200).json({
            message: "Bulk upload completed",
            total: results.length,
            successful: successCount,
            failed: errorCount,
            credentials
          });

        } catch (error) {
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
// Get teacher dashboard data
module.exports.getTeacherDashboard = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const userType = req.user.type;

    // Find the teacher
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        message: "Teacher not found"
      });
    }

    // Get current date for filtering
    const today = new Date();
    const currentAcademicYear = "2024-2025"; // This should be dynamic based on current academic year

    // Get classes assigned to this teacher
    const Class = require('../models/classModel');
    const assignedClasses = await Class.find({
      $or: [
        { classTeacher: teacherId },
        { 'subjects.teacher': teacherId }
      ],
      academicYear: currentAcademicYear
    }).populate('subjects.subject');

    // Get subjects assigned to this teacher
    const assignedSubjects = [];
    const subjectIds = new Set();
    
    assignedClasses.forEach(cls => {
      cls.subjects.forEach(subjectAssignment => {
        if (subjectAssignment.teacher.toString() === teacherId.toString()) {
          if (!subjectIds.has(subjectAssignment.subject._id.toString())) {
            assignedSubjects.push({
              name: subjectAssignment.subject.name,
              code: subjectAssignment.subject.code,
              grade: subjectAssignment.subject.grade
            });
            subjectIds.add(subjectAssignment.subject._id.toString());
          }
        }
      });
    });

    // Count total students in assigned classes
    const Student = require('../models/studentData');
    let totalStudents = 0;
    for (const cls of assignedClasses) {
      const studentCount = await Student.countDocuments({
        className: cls.name,
        section: cls.section,
        academicYear: cls.academicYear,
        status: 'Active'
      });
      totalStudents += studentCount;
    }

    // Get today's schedule
    const Timetable = require('../models/timetableModel');
    const todaySchedule = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = dayNames[today.getDay()];

    for (const cls of assignedClasses) {
      const timetable = await Timetable.findOne({
        class: cls._id,
        academicYear: currentAcademicYear
      }).populate(`schedule.${todayName}.subject schedule.${todayName}.teacher`);

      if (timetable && timetable.schedule[todayName]) {
        timetable.schedule[todayName].forEach(period => {
          if (period.teacher && period.teacher._id.toString() === teacherId.toString()) {
            todaySchedule.push({
              time: period.time,
              subject: period.subject?.name || 'Unknown',
              class: `${cls.name} - ${cls.section}`,
              room: period.room
            });
          }
        });
      }
    }

    // Get upcoming exams for teacher's subjects
    const Exam = require('../models/examModel');
    const upcomingExams = await Exam.find({
      teacher: teacherId,
      examDate: { $gte: today },
      status: 'Scheduled'
    }).populate('subject class').sort({ examDate: 1 }).limit(5);

    // Get recent attendance records marked by this teacher
    const Attendance = require('../models/attendanceModel');
    const recentAttendance = await Attendance.aggregate([
      {
        $match: {
          markedBy: teacherId,
          date: { $gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
        }
      },
      {
        $lookup: {
          from: 'classes',
          localField: 'classId',
          foreignField: '_id',
          as: 'classInfo'
        }
      },
      {
        $group: {
          _id: { classId: '$classId', date: '$date' },
          present: { $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] } },
          total: { $sum: 1 },
          date: { $first: '$date' },
          classInfo: { $first: '$classInfo' }
        }
      },
      {
        $sort: { date: -1 }
      },
      {
        $limit: 5
      }
    ]);

    const dashboardData = {
      totalStudents: totalStudents,
      assignedClasses: assignedClasses.map(cls => ({
        name: cls.name,
        section: cls.section,
        room: cls.room,
        studentCount: cls.students?.length || 0
      })),
      assignedSubjects: assignedSubjects,
      todaySchedule: todaySchedule.sort((a, b) => a.time.localeCompare(b.time)),
      upcomingExams: upcomingExams.map(exam => ({
        subject: exam.subject?.name || 'Unknown',
        class: exam.class ? `${exam.class.name} - ${exam.class.section}` : 'Unknown',
        date: exam.examDate,
        time: exam.startTime,
        type: exam.examType
      })),
      recentAttendance: recentAttendance.map(record => ({
        class: record.classInfo[0] ? `${record.classInfo[0].name} - ${record.classInfo[0].section}` : 'Unknown',
        date: record.date,
        present: record.present,
        total: record.total
      }))
    };

    return res.status(200).json(dashboardData);

  } catch (error) {
    console.error("Error fetching teacher dashboard:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};