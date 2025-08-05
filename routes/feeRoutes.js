const express = require("express");
const router = express.Router();
const {
  getFeeDetails,
  generateFeeCollection,
  updateLateFees,
} = require("../controllers/feeController");

router.get("/:studentId", getFeeDetails);
router.post("/generate", generateFeeCollection);
router.put("/update-late-fees", updateLateFees);

module.exports = router;
