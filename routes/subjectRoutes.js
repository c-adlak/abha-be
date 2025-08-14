const express = require("express");
const router = express.Router();
const subjectController = require("../controllers/subjectController");
const { authenticateToken, requireAdmin, requireTeacher } = require("../middleware/auth");
const upload = require("../middleware/upload");

// Get all subjects (admin and teachers can view)
router.get("/", authenticateToken, requireTeacher, subjectController.getAllSubjects);

// Get subject by ID (authenticated users can view)
router.get("/:id", authenticateToken, subjectController.getSubjectById);

// Get subjects taught by a teacher (admin/teacher)
router.get("/teacher/:teacherId", authenticateToken, requireTeacher, subjectController.getSubjectsByTeacher);

// Get subjects for a class (admin/teacher)
router.get("/class/:classId", authenticateToken, requireTeacher, subjectController.getSubjectsByClass);

// Create new subject (admin only)
router.post("/", authenticateToken, requireAdmin, subjectController.createSubject);

// Update subject (admin only)
router.put("/:id", authenticateToken, requireAdmin, subjectController.updateSubject);

// Delete subject (admin only)
router.delete("/:id", authenticateToken, requireAdmin, subjectController.deleteSubject);

// Bulk upload subjects (Admin only)
router.post(
  "/bulk-upload",
  authenticateToken,
  requireAdmin,
  upload.single('csvFile'),
  subjectController.bulkUploadSubjects
);

module.exports = router; 