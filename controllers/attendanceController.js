const Attendance = require("../models/attendanceModel");
const Student = require("../models/studentData");
const Class = require("../models/classModel");

// Mark attendance for a single student
module.exports.markAttendance = async (req, res) => {
  try {
    const { studentId, classId, date, status, remarks } = req.body;
    const teacherId = req.user.id;

    // Validate required fields
    if (!studentId || !classId || !date || !status) {
      return res.status(400).json({
        message: "Student ID, Class ID, Date, and Status are required"
      });
    }

    // Check if student exists and belongs to the class
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        message: "Student not found"
      });
    }

    // Check if teacher is assigned to this class
    const classInfo = await Class.findById(classId);
    if (!classInfo) {
      return res.status(404).json({
        message: "Class not found"
      });
    }

    // Check if attendance already exists for this date
    const existingAttendance = await Attendance.findOne({
      studentId,
      classId,
      date: new Date(date)
    });

    const attendanceData = {
      studentId,
      classId,
      date: new Date(date),
      status,
      markedBy: teacherId,
      remarks: remarks || "",
      academicYear: student.academicYear,
      month: new Date(date).getMonth() + 1,
      week: Math.ceil(new Date(date).getDate() / 7)
    };

    let result;
    if (existingAttendance) {
      // Update existing attendance
      result = await Attendance.findByIdAndUpdate(
        existingAttendance._id,
        attendanceData,
        { new: true }
      );
    } else {
      // Create new attendance
      result = await Attendance.create(attendanceData);
    }

    return res.status(200).json({
      message: "Attendance marked successfully",
      attendance: result
    });

  } catch (error) {
    console.error("Error marking attendance:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Mark attendance for multiple students (bulk)
module.exports.markBulkAttendance = async (req, res) => {
  try {
    const { classId, date, attendanceData } = req.body;
    const teacherId = req.user.id;

    if (!classId || !date || !attendanceData || !Array.isArray(attendanceData)) {
      return res.status(400).json({
        message: "Class ID, Date, and Attendance Data array are required"
      });
    }

    const results = [];
    const errors = [];

    for (const item of attendanceData) {
      try {
        const { studentId, status, remarks } = item;

        if (!studentId || !status) {
          errors.push({
            studentId,
            error: "Student ID and Status are required"
          });
          continue;
        }

        // Check if attendance already exists
        const existingAttendance = await Attendance.findOne({
          studentId,
          classId,
          date: new Date(date)
        });

        const attendanceRecord = {
          studentId,
          classId,
          date: new Date(date),
          status,
          markedBy: teacherId,
          remarks: remarks || "",
          academicYear: new Date().getFullYear() + "-" + (new Date().getFullYear() + 1),
          month: new Date(date).getMonth() + 1,
          week: Math.ceil(new Date(date).getDate() / 7)
        };

        let result;
        if (existingAttendance) {
          result = await Attendance.findByIdAndUpdate(
            existingAttendance._id,
            attendanceRecord,
            { new: true }
          );
        } else {
          result = await Attendance.create(attendanceRecord);
        }

        results.push(result);
      } catch (error) {
        errors.push({
          studentId: item.studentId,
          error: error.message
        });
      }
    }

    return res.status(200).json({
      message: "Bulk attendance marked",
      successful: results.length,
      failed: errors.length,
      results,
      errors
    });

  } catch (error) {
    console.error("Error marking bulk attendance:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get attendance for a class on a specific date
module.exports.getClassAttendance = async (req, res) => {
  try {
    const { classId, date } = req.params;
    const teacherId = req.user.id;

    // Check if teacher is assigned to this class
    const classInfo = await Class.findById(classId);
    if (!classInfo) {
      return res.status(404).json({
        message: "Class not found"
      });
    }

    // Get all students in the class
    const students = await Student.find({ 
      className: classInfo.name, 
      section: classInfo.section,
      academicYear: classInfo.academicYear 
    });

    // Get attendance for the specific date
    const attendance = await Attendance.find({
      classId,
      date: new Date(date)
    });

    // Create attendance map
    const attendanceMap = {};
    attendance.forEach(record => {
      attendanceMap[record.studentId.toString()] = record;
    });

    // Prepare response with student info and attendance
    const attendanceData = students.map(student => ({
      student: {
        _id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        rollNo: student.rollNo,
        scholarNumber: student.scholarNumber
      },
      attendance: attendanceMap[student._id.toString()] || null
    }));

    return res.status(200).json({
      message: "Class attendance fetched successfully",
      date: new Date(date),
      class: classInfo,
      attendance: attendanceData
    });

  } catch (error) {
    console.error("Error fetching class attendance:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get student attendance for a date range
module.exports.getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "Start date and end date are required"
      });
    }

    const attendance = await Attendance.find({
      studentId,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort({ date: 1 });

    // Calculate attendance statistics
    const totalDays = attendance.length;
    const presentDays = attendance.filter(record => record.status === "Present").length;
    const absentDays = attendance.filter(record => record.status === "Absent").length;
    const lateDays = attendance.filter(record => record.status === "Late").length;
    const halfDays = attendance.filter(record => record.status === "Half Day").length;

    const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    return res.status(200).json({
      message: "Student attendance fetched successfully",
      studentId,
      dateRange: { startDate, endDate },
      statistics: {
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        halfDays,
        attendancePercentage: Math.round(attendancePercentage * 100) / 100
      },
      attendance
    });

  } catch (error) {
    console.error("Error fetching student attendance:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get monthly attendance report for a class
module.exports.getMonthlyReport = async (req, res) => {
  try {
    const { classId, month, year } = req.params;
    const teacherId = req.user.id;

    // Check if teacher is assigned to this class
    const classInfo = await Class.findById(classId);
    if (!classInfo) {
      return res.status(404).json({
        message: "Class not found"
      });
    }

    // Get all students in the class
    const students = await Student.find({ 
      className: classInfo.name, 
      section: classInfo.section,
      academicYear: classInfo.academicYear 
    });

    // Get attendance for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendance = await Attendance.find({
      classId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });

    // Calculate attendance for each student
    const studentAttendance = students.map(student => {
      const studentAttendance = attendance.filter(record => 
        record.studentId.toString() === student._id.toString()
      );

      const totalDays = studentAttendance.length;
      const presentDays = studentAttendance.filter(record => record.status === "Present").length;
      const absentDays = studentAttendance.filter(record => record.status === "Absent").length;
      const lateDays = studentAttendance.filter(record => record.status === "Late").length;
      const halfDays = studentAttendance.filter(record => record.status === "Half Day").length;

      const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

      return {
        student: {
          _id: student._id,
          name: `${student.firstName} ${student.lastName}`,
          rollNo: student.rollNo,
          scholarNumber: student.scholarNumber
        },
        statistics: {
          totalDays,
          presentDays,
          absentDays,
          lateDays,
          halfDays,
          attendancePercentage: Math.round(attendancePercentage * 100) / 100
        },
        dailyAttendance: studentAttendance.sort((a, b) => new Date(a.date) - new Date(b.date))
      };
    });

    return res.status(200).json({
      message: "Monthly attendance report generated successfully",
      class: classInfo,
      month,
      year,
      totalStudents: students.length,
      studentAttendance
    });

  } catch (error) {
    console.error("Error generating monthly report:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};
