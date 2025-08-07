const Subject = require("../models/subjectModel");

// Get all subjects
exports.getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({ isActive: true }).sort({ name: 1 });

    res.json({
      success: true,
      subjects,
    });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get subject by ID
exports.getSubjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await Subject.findById(id);

    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    res.json({
      success: true,
      subject,
    });
  } catch (error) {
    console.error("Error fetching subject:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Create new subject (admin only)
exports.createSubject = async (req, res) => {
  try {
    const { name, code, description, grade, hoursPerWeek } = req.body;

    // Validate required fields
    if (!name || !code || !description || !grade || !hoursPerWeek) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Check if subject code already exists
    const existingSubject = await Subject.findOne({ code });
    if (existingSubject) {
      return res.status(400).json({
        success: false,
        message: "Subject with this code already exists",
      });
    }

    const newSubject = new Subject({
      name,
      code,
      description,
      grade,
      hoursPerWeek,
      createdBy: req.user?.enrollmentNo || "admin",
    });

    const savedSubject = await newSubject.save();

    res.status(201).json({
      success: true,
      message: "Subject created successfully",
      subject: savedSubject,
    });
  } catch (error) {
    console.error("Error creating subject:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update subject (admin only)
exports.updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    // Check if code is being updated and if it already exists
    if (updateData.code && updateData.code !== subject.code) {
      const existingSubject = await Subject.findOne({ code: updateData.code });
      if (existingSubject) {
        return res.status(400).json({
          success: false,
          message: "Subject with this code already exists",
        });
      }
    }

    const updatedSubject = await Subject.findByIdAndUpdate(
      id,
      {
        ...updateData,
        updatedBy: req.user?.enrollmentNo || "admin",
      },
      { new: true }
    );

    res.json({
      success: true,
      message: "Subject updated successfully",
      subject: updatedSubject,
    });
  } catch (error) {
    console.error("Error updating subject:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Delete subject (admin only)
exports.deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;

    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: "Subject not found",
      });
    }

    // Soft delete by setting isActive to false
    await Subject.findByIdAndUpdate(id, { isActive: false });

    res.json({
      success: true,
      message: "Subject deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting subject:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}; 