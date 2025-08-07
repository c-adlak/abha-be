const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Unified login route that handles students, teachers, and admins
router.route("/login").post(async (req, res) => {
  const { role } = req.body;
  
  if (role === "student") {
    return authController.login(req, res);
  } else if (role === "employee" || role === "teacher") {
    return authController.teacherLogin(req, res);
  } else if (role === "admin") {
    return authController.adminLogin(req, res);
  } else {
    return res.status(400).json({ message: "Invalid role specified" });
  }
});

module.exports = router;
