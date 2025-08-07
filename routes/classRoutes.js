const express = require("express");
const router = express.Router();
const classController = require("../controllers/classController");

// Get all classes (admin only)
router.get("/", classController.getAllClasses);

// Get class by ID
router.get("/:id", classController.getClassById);

// Get student's class information
router.get("/student/:studentId", classController.getStudentClass);

// Get teacher's classes
router.get("/teacher/:teacherId", classController.getTeacherClasses);

// Create new class (admin only)
router.post("/", classController.createClass);

// Update class (admin only)
router.put("/:id", classController.updateClass);

// Add student to class
router.post("/add-student", classController.addStudentToClass);

// Remove student from class
router.post("/remove-student", classController.removeStudentFromClass);

// Delete class (admin only)
router.delete("/:id", classController.deleteClass);

module.exports = router; 