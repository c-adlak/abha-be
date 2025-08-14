const FeeCollection = require('../models/feeCollection');

/**
 * Check if student has any pending fee dues
 * @param {string} studentId - Student ID
 * @param {string} academicYear - Academic year to check
 * @returns {Promise<boolean>} True if student has no pending dues
 */
const hasNoPendingDues = async (studentId, academicYear) => {
  try {
    const feeCollections = await FeeCollection.find({
      studentId: studentId,
      academicYear: academicYear,
      isActive: true
    });

    if (feeCollections.length === 0) {
      return true; // No fees assigned, so no dues
    }

    // Check if all fee collections are fully paid
    for (const feeCollection of feeCollections) {
      if (feeCollection.paymentStatus !== 'PAID') {
        return false; // Has pending dues
      }
    }

    return true; // All dues are paid
  } catch (error) {
    console.error('Error checking fee dues:', error);
    return false; // Default to false on error
  }
};

/**
 * Check if student can access exam results based on fee payment
 * @param {string} studentId - Student ID
 * @param {string} academicYear - Academic year
 * @returns {Promise<Object>} Result with canAccess and reason
 */
const canAccessExamResults = async (studentId, academicYear) => {
  try {
    const hasNoDues = await hasNoPendingDues(studentId, academicYear);
    
    if (hasNoDues) {
      return {
        canAccess: true,
        reason: 'All fees are paid'
      };
    } else {
      return {
        canAccess: false,
        reason: 'Pending fee dues. Please clear all dues to view exam results.'
      };
    }
  } catch (error) {
    console.error('Error checking exam result access:', error);
    return {
      canAccess: false,
      reason: 'Unable to verify fee status. Please contact administration.'
    };
  }
};

/**
 * Get student's fee summary
 * @param {string} studentId - Student ID
 * @param {string} academicYear - Academic year
 * @returns {Promise<Object>} Fee summary
 */
const getFeeSummary = async (studentId, academicYear) => {
  try {
    const feeCollections = await FeeCollection.find({
      studentId: studentId,
      academicYear: academicYear,
      isActive: true
    });

    let totalAmount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;
    let overdueAmount = 0;

    feeCollections.forEach(fee => {
      totalAmount += fee.totalAmount || 0;
      paidAmount += fee.paidAmount || 0;
      
      if (fee.paymentStatus === 'PENDING' || fee.paymentStatus === 'PARTIAL') {
        pendingAmount += (fee.totalAmount - fee.paidAmount);
      }
      
      if (fee.paymentStatus === 'OVERDUE') {
        overdueAmount += (fee.totalAmount - fee.paidAmount);
      }
    });

    return {
      totalAmount,
      paidAmount,
      pendingAmount,
      overdueAmount,
      paymentStatus: pendingAmount === 0 ? 'PAID' : 'PENDING',
      feeCollections: feeCollections.length
    };
  } catch (error) {
    console.error('Error getting fee summary:', error);
    throw error;
  }
};

module.exports = {
  hasNoPendingDues,
  canAccessExamResults,
  getFeeSummary
};
