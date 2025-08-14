const express = require("express");
const router = express.Router();
const { authenticateToken, requireAdmin, requireTeacher, requireStudent } = require("../middleware/auth");
const upload = require("../middleware/upload");
const timetableController = require("../controllers/timetableController");

// Bulk upload timetable (Admin only)
router.route("/bulk-upload").post(
  authenticateToken,
  requireAdmin,
  upload.single('csvFile'),
  timetableController.bulkUploadTimetable
);

// Upsert a single timetable entry
router.post(
  "/entry/upsert",
  authenticateToken,
  requireAdmin,
  timetableController.upsertEntry
);

// Get timetable by class (Teachers and Students can view their assigned classes)
router.route("/class/:classId").get(authenticateToken, async (req, res) => {
  try {
  const Timetable = require("../models/timetableModel");
  const timetable = await Timetable.findOne({ class: req.params.classId })
      .populate('schedule.Monday.subject', 'name code')
      .populate('schedule.Monday.teacher', 'name enrollmentNo')
      .populate('schedule.Tuesday.subject', 'name code')
      .populate('schedule.Tuesday.teacher', 'name enrollmentNo')
      .populate('schedule.Wednesday.subject', 'name code')
      .populate('schedule.Wednesday.teacher', 'name enrollmentNo')
      .populate('schedule.Thursday.subject', 'name code')
      .populate('schedule.Thursday.teacher', 'name enrollmentNo')
      .populate('schedule.Friday.subject', 'name code')
      .populate('schedule.Friday.teacher', 'name enrollmentNo')
      .populate('schedule.Saturday.subject', 'name code')
      .populate('schedule.Saturday.teacher', 'name enrollmentNo');
    if (!timetable) return res.status(200).json({ message: "No timetable", timetable: {} });
    return res.status(200).json({ message: "Timetable fetched successfully", timetable });
  } catch (e) {
    console.error('Error fetching timetable:', e);
    return res.status(500).json({ message: 'Internal server error', error: e.message });
  }
});

// Get teacher's timetable (Teachers can view their own timetable)
router.route("/teacher/:teacherId").get(authenticateToken, requireTeacher, (req, res) => {
  // TODO: Implement get teacher timetable
  res.status(200).json({
    message: "Teacher timetable fetched successfully",
    timetable: []
  });
});

// Get student's timetable (Students can view their own timetable)
router.route("/student/:studentId").get(authenticateToken, requireStudent, (req, res) => {
  // TODO: Implement get student timetable
  res.status(200).json({
    message: "Student timetable fetched successfully",
    timetable: []
  });
});

// Add/Update timetable entry (Admin and Teachers can manage)
router.route("/entry").post(authenticateToken, requireAdmin, (req, res) => {
  // TODO: Implement add timetable entry
  res.status(201).json({
    message: "Timetable entry added successfully"
  });
});

// Update timetable entry (Admin and Teachers can manage)
router.route("/entry/:entryId").put(authenticateToken, requireAdmin, (req, res) => {
  // TODO: Implement update timetable entry
  res.status(200).json({
    message: "Timetable entry updated successfully"
  });
});

// Delete timetable entry (Admin only)
router.route("/entry/:entryId").delete(authenticateToken, requireAdmin, (req, res) => {
  // TODO: Implement delete timetable entry
  res.status(200).json({
    message: "Timetable entry deleted successfully"
  });
});

module.exports = router;
