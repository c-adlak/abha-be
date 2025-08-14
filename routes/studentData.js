const express = require("express");
const router = express.Router();
const StudentDataController = require("../controllers/studentData");
const { authenticateToken, requireAdmin, requireTeacher } = require("../middleware/auth");
const multer = require("multer");

// Configure multer for CSV file upload
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Admin/Teacher only routes
router.route("/create-student").post(authenticateToken, requireAdmin, StudentDataController.createStudent);
router.route("/getallstudents").get(authenticateToken, requireTeacher, StudentDataController.getAllStudents);

// Student can access their own data, teachers/admins can access any student
router
  .route("/get-student/:enrollNo")
  .get(authenticateToken, StudentDataController.getStudentById);

router
  .route("/update-student/:enrollNo")
  .put(authenticateToken, requireTeacher, StudentDataController.updateStudent);

// New route for student profile (student can access their own profile)
router.route("/profile").get(authenticateToken, StudentDataController.getStudentProfile);

// Student dashboard data
router.route("/dashboard").get(authenticateToken, StudentDataController.getStudentDashboard);

// Bulk upload students from CSV (Admin only)
router.route("/bulk-upload")
  .post(authenticateToken, requireAdmin, upload.single('csvFile'), StudentDataController.bulkUploadStudents);

// Change password (for first login)
router.route("/change-password")
  .post(authenticateToken, StudentDataController.changePassword);

module.exports = router;
