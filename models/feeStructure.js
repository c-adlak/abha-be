const mongoose = require("mongoose");

const feeStructureSchema = new mongoose.Schema(
  {
    academicYear: {
      type: String,
      required: true,
    },
    class: {
      type: String,
      required: true,
    },
    feeComponents: [
      {
        componentName: {
          type: String,
          required: true, // e.g., "Tuition Fee", "Library Fee", "Sports Fee"
        },
        amount: {
          type: Number,
          required: true,
        },
        frequency: {
          type: String,
          enum: ["MONTHLY", "QUARTERLY", "ANNUALLY", "ONE_TIME"],
          required: true,
        },
        dueDate: {
          type: Number, // Day of month when due (1-31)
          required: true,
        },
        isOptional: {
          type: Boolean,
          default: false,
        },
      },
    ],
    totalAnnualFee: {
      type: Number,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
feeStructureSchema.index({ academicYear: 1, class: 1 });

module.exports = mongoose.model("FeeStructure", feeStructureSchema);
