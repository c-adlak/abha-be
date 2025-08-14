const express = require("express");
const router = express.Router();
const {
  getFeeDetails,
  generateFeeCollection,
  updateLateFees,
  upsertFeeStructure,
  assignFeesToClass,
  bulkUploadFeeStructure,
} = require("../controllers/feeController");
const { authenticateToken, requireAdmin, requireTeacher } = require("../middleware/auth");

// Students can view their own fees, teachers/admins can view any student's fees
router.get("/:studentId", authenticateToken, getFeeDetails);

// Only admins can generate fee collections
router.post("/generate", authenticateToken, requireAdmin, generateFeeCollection);

// Only admins can update late fees
router.put("/update-late-fees", authenticateToken, requireAdmin, updateLateFees);

// Admin: create/update fee structure for class/year
router.post("/structure", authenticateToken, requireAdmin, upsertFeeStructure);

// Admin: assign fees to all students of a class/year
router.post("/assign", authenticateToken, requireAdmin, assignFeesToClass);

// Admin: bulk upload fee structure CSV
const upload = require("../middleware/upload");
router.post("/structure/bulk-upload", authenticateToken, requireAdmin, upload.single('csvFile'), bulkUploadFeeStructure);

module.exports = router;
