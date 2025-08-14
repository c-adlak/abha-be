const express = require("express");
const router = express.Router();
const PromotionController = require("../controllers/promotionController");
const { authenticateToken, requireAdmin, requireTeacher } = require("../middleware/auth");

// Check promotion eligibility for a student
router.route("/eligibility/:studentId")
  .post(authenticateToken, requireTeacher, PromotionController.checkPromotionEligibility);

// Promote a single student
router.route("/promote/:studentId")
  .post(authenticateToken, requireAdmin, PromotionController.promoteStudent);

// Bulk promote students in a class
router.route("/bulk-promote")
  .post(authenticateToken, requireAdmin, PromotionController.bulkPromoteClass);

// Get promotion history for a student
router.route("/history/:studentId")
  .get(authenticateToken, requireTeacher, PromotionController.getPromotionHistory);

// Get students eligible for promotion in a class
router.route("/eligible-students")
  .get(authenticateToken, requireTeacher, PromotionController.getEligibleStudents);

module.exports = router;
