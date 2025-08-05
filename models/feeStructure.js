// models/FeeStructure.js
const mongoose = require("mongoose");

const feeStructureSchema = new mongoose.Schema(
  {
    academicYear: { type: String, required: true },
    class: { type: String, required: true },
    feeComponents: [
      {
        componentName: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 },
        frequency: {
          type: String,
          enum: ["MONTHLY", "QUARTERLY", "ANNUALLY", "ONE_TIME"],
          required: true,
        },
        dueDate: { type: Number, required: true, min: 1, max: 31 },
        isOptional: { type: Boolean, default: false },
        description: String,
      },
    ],
    totalAnnualFee: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: String,
    lastModifiedBy: String,
  },
  { timestamps: true }
);

// Compound index for unique fee structure per class per year
feeStructureSchema.index({ academicYear: 1, class: 1 }, { unique: true });

// Calculate total fee before saving
feeStructureSchema.pre("save", function (next) {
  this.totalAnnualFee = this.feeComponents.reduce((total, component) => {
    let multiplier = 1;
    switch (component.frequency) {
      case "MONTHLY":
        multiplier = 12;
        break;
      case "QUARTERLY":
        multiplier = 4;
        break;
      case "ANNUALLY":
        multiplier = 1;
        break;
      default:
        multiplier = 1;
    }
    return total + component.amount * multiplier;
  }, 0);
  next();
});

module.exports = mongoose.model("FeeStructure", feeStructureSchema);
