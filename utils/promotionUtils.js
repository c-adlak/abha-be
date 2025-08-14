const Student = require('../models/studentData');
const ExamResult = require('../models/examResultModel');

/**
 * Calculate promotion eligibility based on exam results
 * @param {string} studentId - Student ID
 * @param {string} academicYear - Current academic year
 * @param {Object} promotionCriteria - Criteria for promotion
 * @returns {Promise<Object>} Promotion eligibility result
 */
const calculatePromotionEligibility = async (studentId, academicYear, promotionCriteria = {}) => {
  try {
    const {
      minimumPercentage = 40, // Default minimum percentage
      minimumAttendance = 75, // Default minimum attendance percentage
      requiredSubjects = [] // Specific subjects that must be passed
    } = promotionCriteria;

    // Get student's exam results for the academic year
    const examResults = await ExamResult.find({
      student: studentId,
      academicYear: academicYear
    }).populate('exam');

    if (examResults.length === 0) {
      return {
        eligible: false,
        reason: 'No exam results found for the academic year',
        details: {
          totalExams: 0,
          passedExams: 0,
          averagePercentage: 0,
          attendance: 0
        }
      };
    }

    // Calculate overall performance
    let totalMarks = 0;
    let obtainedMarks = 0;
    let passedExams = 0;
    let totalExams = examResults.length;

    examResults.forEach(result => {
      totalMarks += result.totalMarks;
      obtainedMarks += result.marksObtained;
      
      const percentage = (result.marksObtained / result.totalMarks) * 100;
      if (percentage >= minimumPercentage) {
        passedExams++;
      }
    });

    const averagePercentage = (obtainedMarks / totalMarks) * 100;
    const passRate = (passedExams / totalExams) * 100;

    // Check promotion criteria
    const isEligible = averagePercentage >= minimumPercentage && passRate >= 60;

    return {
      eligible: isEligible,
      reason: isEligible ? 'Meets promotion criteria' : 'Does not meet promotion criteria',
      details: {
        totalExams,
        passedExams,
        averagePercentage: Math.round(averagePercentage * 100) / 100,
        passRate: Math.round(passRate * 100) / 100,
        minimumRequired: minimumPercentage,
        attendance: 0 // TODO: Implement attendance calculation
      }
    };

  } catch (error) {
    console.error('Error calculating promotion eligibility:', error);
    throw error;
  }
};

/**
 * Get next class information for promotion
 * @param {string} currentClass - Current class (e.g., "10", "11")
 * @param {string} currentSection - Current section (e.g., "A", "B")
 * @returns {Object} Next class information
 */
const getNextClassInfo = (currentClass, currentSection) => {
  const classNumber = parseInt(currentClass);
  
  if (classNumber >= 12) {
    return {
      nextClass: null,
      nextSection: null,
      isGraduated: true,
      message: 'Student has completed highest class'
    };
  }

  const nextClass = (classNumber + 1).toString();
  
  return {
    nextClass,
    nextSection: currentSection, // Keep same section
    isGraduated: false,
    message: `Eligible for promotion to Class ${nextClass}-${currentSection}`
  };
};

/**
 * Process student promotion
 * @param {string} studentId - Student ID
 * @param {string} newAcademicYear - New academic year
 * @param {Object} promotionData - Promotion details
 * @returns {Promise<Object>} Promotion result
 */
const processPromotion = async (studentId, newAcademicYear, promotionData = {}) => {
  try {
    const student = await Student.findById(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    // Check promotion eligibility
    const eligibility = await calculatePromotionEligibility(
      studentId, 
      student.academicYear
    );

    if (!eligibility.eligible) {
      return {
        success: false,
        reason: eligibility.reason,
        details: eligibility.details
      };
    }

    // Get next class information
    const nextClassInfo = getNextClassInfo(student.className, student.section);
    
    if (nextClassInfo.isGraduated) {
      // Update student status to graduated
      await Student.findByIdAndUpdate(studentId, {
        status: 'Graduated',
        updatedAt: new Date()
      });

      return {
        success: true,
        message: 'Student has graduated successfully',
        details: {
          currentClass: student.className,
          currentSection: student.section,
          newStatus: 'Graduated'
        }
      };
    }

    // Update student class and academic year
    const updateData = {
      className: nextClassInfo.nextClass,
      section: nextClassInfo.nextSection,
      academicYear: newAcademicYear,
      rollNo: '', // Reset roll number for new class
      updatedAt: new Date()
    };

    // Add promotion history
    if (!student.promotionHistory) {
      updateData.promotionHistory = [];
    }
    
    updateData.promotionHistory = [
      ...(student.promotionHistory || []),
      {
        fromClass: student.className,
        fromSection: student.section,
        toClass: nextClassInfo.nextClass,
        toSection: nextClassInfo.nextSection,
        fromAcademicYear: student.academicYear,
        toAcademicYear: newAcademicYear,
        promotedAt: new Date(),
        reason: 'Academic performance',
        eligibilityDetails: eligibility.details
      }
    ];

    await Student.findByIdAndUpdate(studentId, updateData);

    return {
      success: true,
      message: `Student promoted to Class ${nextClassInfo.nextClass}-${nextClassInfo.nextSection}`,
      details: {
        currentClass: student.className,
        currentSection: student.section,
        newClass: nextClassInfo.nextClass,
        newSection: nextClassInfo.nextSection,
        newAcademicYear,
        eligibilityDetails: eligibility.details
      }
    };

  } catch (error) {
    console.error('Error processing promotion:', error);
    throw error;
  }
};

/**
 * Bulk promotion for a class
 * @param {string} className - Class to promote
 * @param {string} section - Section to promote
 * @param {string} newAcademicYear - New academic year
 * @param {Object} promotionCriteria - Criteria for promotion
 * @returns {Promise<Object>} Bulk promotion result
 */
const processBulkPromotion = async (className, section, newAcademicYear, promotionCriteria = {}) => {
  try {
    // Get all students in the class
    const students = await Student.find({
      className,
      section,
      status: 'Active'
    });

    const results = {
      total: students.length,
      successful: 0,
      failed: 0,
      details: []
    };

    for (const student of students) {
      try {
        const promotionResult = await processPromotion(
          student._id,
          newAcademicYear,
          promotionCriteria
        );

        if (promotionResult.success) {
          results.successful++;
        } else {
          results.failed++;
        }

        results.details.push({
          studentId: student._id,
          studentName: `${student.firstName} ${student.lastName}`,
          enrollmentNo: student.enrollmentNo,
          result: promotionResult
        });

      } catch (error) {
        results.failed++;
        results.details.push({
          studentId: student._id,
          studentName: `${student.firstName} ${student.lastName}`,
          enrollmentNo: student.enrollmentNo,
          error: error.message
        });
      }
    }

    return results;

  } catch (error) {
    console.error('Error processing bulk promotion:', error);
    throw error;
  }
};

module.exports = {
  calculatePromotionEligibility,
  getNextClassInfo,
  processPromotion,
  processBulkPromotion
};
