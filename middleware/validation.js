const { body, validationResult } = require("express-validator");

exports.validatePayment = [
  body("amount").isNumeric().withMessage("Amount must be numeric"),
  body("studentId").isMongoId().withMessage("Invalid student ID"),
  body("feeCollectionId").isMongoId().withMessage("Invalid fee collection ID"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];
