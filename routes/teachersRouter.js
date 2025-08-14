const express = require("express");
const router = express.Router();
const TeacherController = require("../controllers/teacherController");
const { authenticateToken, requireAdmin, requireTeacher } = require("../middleware/auth");
const upload = require("../middleware/upload");

// Admin only routes
router.route("/create-teacher").post(authenticateToken, requireAdmin, TeacherController.createTeacher);

// Bulk upload teachers (Admin only)
router.route("/bulk-upload").post(authenticateToken, requireAdmin, upload.single('csvFile'), TeacherController.bulkUploadTeachers);

// Admin and teachers can view all teachers
router.route("/getallteacher").get(authenticateToken, requireTeacher, TeacherController.getAllTeachers);

// Teachers can view their own profile, admins can view any teacher
router.route("/get-teacher/:enrollNo").get(authenticateToken, TeacherController.getTeacherById);

// Only admins can update teacher information
router.route("/update-teacher/:enrollNo").put(authenticateToken, requireAdmin, TeacherController.updateTeacher);

// New route for teacher profile
router.route("/profile").get(authenticateToken, TeacherController.getTeacherProfile);

// Teacher dashboard data
router.route("/dashboard").get(authenticateToken, TeacherController.getTeacherDashboard);

// Change password (for first login)
router.route("/change-password")
  .post(authenticateToken, TeacherController.changePassword);

// Update resignation status (Admin only)
router.route("/:enrollNo/resignation-status")
  .put(authenticateToken, requireAdmin, TeacherController.updateResignationStatus);

module.exports = router;
