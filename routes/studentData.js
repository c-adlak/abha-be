const express = require("express");
const router = express.Router();
const StudentDataController = require("../controllers/studentData");
router.route("/create-student").post(StudentDataController.createStudent);
router.route("/getallstudent").get(StudentDataController.getAllStudents);
router
  .route("/get-student/:enrollNo")
  .get(StudentDataController.getStudentById);
router
  .route("/update-student/:enrollNo")
  .get(StudentDataController.updateStudent);

module.exports = router;
