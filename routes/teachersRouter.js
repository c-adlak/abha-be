const express = require("express");
const router = express.Router();
const TeacherController = require("../controllers/teacherController");
router.route("/create-teacher").post(TeacherController.createTeacher);
router.route("/getallteacher").get(TeacherController.getAllTeachers);
router.route("/get-teacher/:enrollNo").get(TeacherController.getTeacherById);
router.route("/update-teacher/:enrollNo").put(TeacherController.updateTeacher);

module.exports = router;
