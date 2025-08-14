const express = require("express");
const router = express.Router();
const attendanceController = require("../controllers/attendanceController");
const { authenticateToken, requireTeacher, requireStudent } = require("../middleware/auth");

// Mark attendance for a single student (Teacher only)
router.post("/mark", authenticateToken, requireTeacher, attendanceController.markAttendance);

// Mark attendance for multiple students (bulk) (Teacher only)
router.post("/bulk-mark", authenticateToken, requireTeacher, attendanceController.markBulkAttendance);

// Get attendance for a class on a specific date (Teacher only)
router.get("/class/:classId/date/:date", authenticateToken, requireTeacher, attendanceController.getClassAttendance);

// Get student attendance for a date range (Student can view their own, Teacher can view any)
router.get("/student/:studentId", authenticateToken, attendanceController.getStudentAttendance);

// Get monthly attendance report for a class (Teacher only)
router.get("/class/:classId/monthly/:month/:year", authenticateToken, requireTeacher, attendanceController.getMonthlyReport);

module.exports = router;
