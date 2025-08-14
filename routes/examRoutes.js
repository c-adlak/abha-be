const express = require("express");
const router = express.Router();
const examController = require("../controllers/examController");
const { authenticateToken, requireAdmin, requireTeacher } = require("../middleware/auth");
const upload = require("../middleware/upload");

// Get all exams (admin and teachers can view)
router.get("/", authenticateToken, requireTeacher, examController.getAllExams);

// Bulk upload exams (Admin only)
router.route("/bulk-upload").post(
  authenticateToken,
  requireAdmin,
  upload.single('csvFile'),
  examController.bulkUploadExams
);

// Get student's exams (students can view their own, teachers/admins can view any)
router.get("/student/:studentId", authenticateToken, examController.getStudentExams);

// Get teacher's exams (teachers can view their own, admins can view any)
router.get("/teacher/:teacherId", authenticateToken, examController.getTeacherExams);

// Get exam by ID (authenticated users can view)
router.get("/:id", authenticateToken, examController.getExamById);

// Create new exam (admin only)
router.post("/", authenticateToken, requireAdmin, examController.createExam);

// Update exam (admin only)
router.put("/:id", authenticateToken, requireAdmin, examController.updateExam);

// Delete exam (admin only)
router.delete("/:id", authenticateToken, requireAdmin, examController.deleteExam);

// Submit exam result (teacher only)
router.post("/result", authenticateToken, requireTeacher, examController.submitExamResult);

// Get exam results for an exam (teachers can view their own exam results, admins can view all)
router.get("/:examId/results", authenticateToken, requireTeacher, examController.getExamResults);

module.exports = router; 