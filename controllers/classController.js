const Class = require("../models/classModel");
const Student = require("../models/studentData");
const Teacher = require("../models/teacherModel");
const Subject = require("../models/subjectModel");

// Get all classes (admin only)
exports.getAllClasses = async (req, res) => {
  try {
    const classes = await Class.find()
      .populate("classTeacher", "name enrollmentNo")
      .populate("subjects.subject", "name code")
      .populate("subjects.teacher", "name enrollmentNo")
      .populate("students", "firstName lastName enrollmentNo")
      .sort({ name: 1, section: 1 });

    res.json({
      success: true,
      classes,
    });
  } catch (error) {
    console.error("Error fetching classes:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get class by ID
exports.getClassById = async (req, res) => {
  try {
    const { id } = req.params;
    const classData = await Class.findById(id)
      .populate("classTeacher", "name enrollmentNo email contact")
      .populate("subjects.subject", "name code description")
      .populate("subjects.teacher", "name enrollmentNo email")
      .populate("students", "firstName lastName enrollmentNo rollNo");

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    res.json({
      success: true,
      class: classData,
    });
  } catch (error) {
    console.error("Error fetching class:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get student's class information
exports.getStudentClass = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Find the student
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Find the class where this student is enrolled
    const classData = await Class.findOne({
      students: studentId,
      academicYear: student.academicYear,
    })
      .populate("classTeacher", "name enrollmentNo email contact")
      .populate("subjects.subject", "name code description")
      .populate("subjects.teacher", "name enrollmentNo email")
      .populate("students", "firstName lastName enrollmentNo rollNo");

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found for this student",
      });
    }

    res.json({
      success: true,
      class: classData,
    });
  } catch (error) {
    console.error("Error fetching student class:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get teacher's classes
exports.getTeacherClasses = async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    // Find classes where this teacher is either class teacher or subject teacher
    const classes = await Class.find({
      $or: [
        { classTeacher: teacherId },
        { "subjects.teacher": teacherId }
      ]
    })
      .populate("classTeacher", "name enrollmentNo")
      .populate("subjects.subject", "name code")
      .populate("subjects.teacher", "name enrollmentNo")
      .populate("students", "firstName lastName enrollmentNo")
      .sort({ name: 1, section: 1 });

    res.json({
      success: true,
      classes,
    });
  } catch (error) {
    console.error("Error fetching teacher classes:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Create new class (admin only)
exports.createClass = async (req, res) => {
  try {
    const {
      name,
      section,
      academicYear,
      classTeacher,
      subjects,
      room,
      schedule,
      capacity,
    } = req.body;

    // Validate required fields
    if (!name || !section || !academicYear || !classTeacher || !room || !schedule || !capacity) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Check if class already exists
    const existingClass = await Class.findOne({
      name,
      section,
      academicYear,
    });

    if (existingClass) {
      return res.status(400).json({
        success: false,
        message: "Class already exists for this academic year",
      });
    }

    // Validate teacher exists
    const teacher = await Teacher.findById(classTeacher);
    if (!teacher) {
      return res.status(400).json({
        success: false,
        message: "Class teacher not found",
      });
    }

    // Validate subjects and their teachers
    for (const subjectData of subjects) {
      const subject = await Subject.findById(subjectData.subject);
      if (!subject) {
        return res.status(400).json({
          success: false,
          message: `Subject with ID ${subjectData.subject} not found`,
        });
      }

      const subjectTeacher = await Teacher.findById(subjectData.teacher);
      if (!subjectTeacher) {
        return res.status(400).json({
          success: false,
          message: `Teacher with ID ${subjectData.teacher} not found`,
        });
      }
    }

    const newClass = new Class({
      name,
      section,
      academicYear,
      classTeacher,
      subjects,
      room,
      schedule,
      capacity,
      createdBy: req.user?.enrollmentNo || "admin",
    });

    const savedClass = await newClass.save();

    res.status(201).json({
      success: true,
      message: "Class created successfully",
      class: savedClass,
    });
  } catch (error) {
    console.error("Error creating class:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update class (admin only)
exports.updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const classData = await Class.findById(id);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    // Update the class
    const updatedClass = await Class.findByIdAndUpdate(
      id,
      {
        ...updateData,
        updatedBy: req.user?.enrollmentNo || "admin",
      },
      { new: true }
    )
      .populate("classTeacher", "name enrollmentNo")
      .populate("subjects.subject", "name code")
      .populate("subjects.teacher", "name enrollmentNo")
      .populate("students", "firstName lastName enrollmentNo");

    res.json({
      success: true,
      message: "Class updated successfully",
      class: updatedClass,
    });
  } catch (error) {
    console.error("Error updating class:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Add student to class
exports.addStudentToClass = async (req, res) => {
  try {
    const { classId, studentId } = req.body;

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Check if student is already in this class
    if (classData.students.includes(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Student is already enrolled in this class",
      });
    }

    // Check if class has capacity
    if (classData.students.length >= classData.capacity) {
      return res.status(400).json({
        success: false,
        message: "Class is at full capacity",
      });
    }

    // Add student to class
    classData.students.push(studentId);
    await classData.save();

    res.json({
      success: true,
      message: "Student added to class successfully",
    });
  } catch (error) {
    console.error("Error adding student to class:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Remove student from class
exports.removeStudentFromClass = async (req, res) => {
  try {
    const { classId, studentId } = req.body;

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    // Remove student from class
    classData.students = classData.students.filter(
      (id) => id.toString() !== studentId
    );
    await classData.save();

    res.json({
      success: true,
      message: "Student removed from class successfully",
    });
  } catch (error) {
    console.error("Error removing student from class:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Delete class (admin only)
exports.deleteClass = async (req, res) => {
  try {
    const { id } = req.params;

    const classData = await Class.findById(id);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    // Check if class has students
    if (classData.students.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete class with enrolled students",
      });
    }

    await Class.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Class deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting class:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}; 