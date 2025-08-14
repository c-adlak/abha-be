const express = require("express");
const router = express.Router();
const classController = require("../controllers/classController");
const { authenticateToken, requireAdmin, requireTeacher } = require("../middleware/auth");
const upload = require("../middleware/upload");

// Get all classes (admin and teachers can view)
router.get("/", authenticateToken, requireTeacher, classController.getAllClasses);

// Bulk upload classes (Admin only)
router.route("/bulk-upload").post(
  authenticateToken,
  requireAdmin,
  upload.single('csvFile'),
  classController.bulkUploadClasses
);

// Get class by ID (authenticated users can view)
router.get("/:id", authenticateToken, classController.getClassById);

// Get student's class information (students can view their own, teachers/admins can view any)
router.get("/student/:studentId", authenticateToken, classController.getStudentClass);

// Get teacher's classes (teachers can view their own, admins can view any)
router.get("/teacher/:teacherId", authenticateToken, classController.getTeacherClasses);

// Create new class (admin only)
router.post("/", authenticateToken, requireAdmin, classController.createClass);

// Update class (admin only)
router.put("/:id", authenticateToken, requireAdmin, classController.updateClass);

// Assign class teacher (admin only)
router.patch(
  "/:id/class-teacher",
  authenticateToken,
  requireAdmin,
  classController.assignClassTeacher
);

// Set class subjects (admin only)
router.put(
  "/:id/subjects",
  authenticateToken,
  requireAdmin,
  classController.setClassSubjects
);

// Generate default classes (admin only)
router.post(
  "/generate-default",
  authenticateToken,
  requireAdmin,
  classController.generateDefaultClasses
);

// Add student to class (admin only)
router.post("/add-student", authenticateToken, requireAdmin, classController.addStudentToClass);

// Remove student from class (admin only)
router.post("/remove-student", authenticateToken, requireAdmin, classController.removeStudentFromClass);

// Delete class (admin only)
router.delete("/:id", authenticateToken, requireAdmin, classController.deleteClass);

module.exports = router; 