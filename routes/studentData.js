const express = require("express");
const router = express.Router();
const StudentDataController = require("../controllers/studentData");
router.route("/create-student").post(StudentDataController.createStudent);
router.route("/getallstudents").get(StudentDataController.getAllStudents);
router
  .route("/get-student/:enrollNo")
  .get(StudentDataController.getStudentById);
router
  .route("/update-student/:enrollNo")
  .put(StudentDataController.updateStudent);

module.exports = router;
