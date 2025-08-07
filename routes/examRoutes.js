const express = require("express");
const router = express.Router();
const examController = require("../controllers/examController");

// Get all exams (admin only)
router.get("/", examController.getAllExams);

// Get student's exams
router.get("/student/:studentId", examController.getStudentExams);

// Get teacher's exams
router.get("/teacher/:teacherId", examController.getTeacherExams);

// Get exam by ID
router.get("/:id", examController.getExamById);

// Create new exam (admin only)
router.post("/", examController.createExam);

// Update exam (admin only)
router.put("/:id", examController.updateExam);

// Delete exam (admin only)
router.delete("/:id", examController.deleteExam);

// Submit exam result (teacher only)
router.post("/result", examController.submitExamResult);

// Get exam results for an exam
router.get("/:examId/results", examController.getExamResults);

module.exports = router; 