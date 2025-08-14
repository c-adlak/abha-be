const { 
  calculatePromotionEligibility, 
  processPromotion, 
  processBulkPromotion 
} = require("../utils/promotionUtils");
const Student = require("../models/studentData");

// Check promotion eligibility for a student
exports.checkPromotionEligibility = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear, promotionCriteria } = req.body;

    if (!studentId || !academicYear) {
      return res.status(400).json({
        success: false,
        message: "Student ID and academic year are required"
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    const eligibility = await calculatePromotionEligibility(
      studentId, 
      academicYear, 
      promotionCriteria
    );

    res.json({
      success: true,
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        enrollmentNo: student.enrollmentNo,
        currentClass: student.className,
        currentSection: student.section,
        currentAcademicYear: student.academicYear
      },
      eligibility
    });

  } catch (error) {
    console.error("Error checking promotion eligibility:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Promote a single student
exports.promoteStudent = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { newAcademicYear, promotionCriteria } = req.body;

    if (!studentId || !newAcademicYear) {
      return res.status(400).json({
        success: false,
        message: "Student ID and new academic year are required"
      });
    }

    const promotionResult = await processPromotion(
      studentId, 
      newAcademicYear, 
      promotionCriteria
    );

    if (promotionResult.success) {
      res.json({
        success: true,
        message: promotionResult.message,
        details: promotionResult.details
      });
    } else {
      res.status(400).json({
        success: false,
        message: promotionResult.reason,
        details: promotionResult.details
      });
    }

  } catch (error) {
    console.error("Error promoting student:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Bulk promote students in a class
exports.bulkPromoteClass = async (req, res) => {
  try {
    const { className, section, newAcademicYear, promotionCriteria } = req.body;

    if (!className || !section || !newAcademicYear) {
      return res.status(400).json({
        success: false,
        message: "Class name, section, and new academic year are required"
      });
    }

    const bulkPromotionResult = await processBulkPromotion(
      className, 
      section, 
      newAcademicYear, 
      promotionCriteria
    );

    res.json({
      success: true,
      message: "Bulk promotion completed",
      results: bulkPromotionResult
    });

  } catch (error) {
    console.error("Error during bulk promotion:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get promotion history for a student
exports.getPromotionHistory = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    const promotionHistory = student.promotionHistory || [];

    res.json({
      success: true,
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        enrollmentNo: student.enrollmentNo,
        currentClass: student.className,
        currentSection: student.section,
        currentAcademicYear: student.academicYear
      },
      promotionHistory
    });

  } catch (error) {
    console.error("Error fetching promotion history:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get students eligible for promotion in a class
exports.getEligibleStudents = async (req, res) => {
  try {
    const { className, section, academicYear, promotionCriteria } = req.query;

    if (!className || !section || !academicYear) {
      return res.status(400).json({
        success: false,
        message: "Class name, section, and academic year are required"
      });
    }

    // Get all students in the class
    const students = await Student.find({
      className,
      section,
      academicYear,
      status: 'Active'
    });

    const eligibilityResults = [];

    for (const student of students) {
      try {
        const eligibility = await calculatePromotionEligibility(
          student._id,
          academicYear,
          promotionCriteria
        );

        eligibilityResults.push({
          student: {
            id: student._id,
            name: `${student.firstName} ${student.lastName}`,
            enrollmentNo: student.enrollmentNo,
            rollNo: student.rollNo
          },
          eligibility
        });
      } catch (error) {
        eligibilityResults.push({
          student: {
            id: student._id,
            name: `${student.firstName} ${student.lastName}`,
            enrollmentNo: student.enrollmentNo,
            rollNo: student.rollNo
          },
          eligibility: {
            eligible: false,
            reason: "Error calculating eligibility",
            details: null
          }
        });
      }
    }

    const eligibleCount = eligibilityResults.filter(r => r.eligibility.eligible).length;
    const totalCount = eligibilityResults.length;

    res.json({
      success: true,
      class: `${className}-${section}`,
      academicYear,
      totalStudents: totalCount,
      eligibleStudents: eligibleCount,
      results: eligibilityResults
    });

  } catch (error) {
    console.error("Error fetching eligible students:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
