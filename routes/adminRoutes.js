const express = require("express");
const router = express.Router();
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const adminController = require("../controllers/adminController");

// Admin dashboard summary
router.get("/dashboard", authenticateToken, requireAdmin, adminController.getDashboardSummary);

module.exports = router;

