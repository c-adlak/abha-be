const express = require("express");
const router = express.Router();
const subjectController = require("../controllers/subjectController");

// Get all subjects
router.get("/", subjectController.getAllSubjects);

// Get subject by ID
router.get("/:id", subjectController.getSubjectById);

// Create new subject (admin only)
router.post("/", subjectController.createSubject);

// Update subject (admin only)
router.put("/:id", subjectController.updateSubject);

// Delete subject (admin only)
router.delete("/:id", subjectController.deleteSubject);

module.exports = router; 