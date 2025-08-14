const Class = require("../models/classModel");
const Student = require("../models/studentData");
const Teacher = require("../models/teacherModel");
const Subject = require("../models/subjectModel");
const { parseCSV } = require("../utils/csvUtils");
const fs = require("fs");

// Get all classes (admin only)
exports.getAllClasses = async (req, res) => {
  try {
    const classes = await Class.find()
      .populate("classTeacher", "name enrollmentNo email contact department designation")
      .populate("subjects.subject", "name code description")
      .populate("subjects.teacher", "name enrollmentNo email department")
      .populate("students", "firstName lastName enrollmentNo rollNo gender className section")
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

// Assign/Change class teacher (admin only)
exports.assignClassTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { teacherId } = req.body;

    if (!teacherId) {
      return res.status(400).json({ success: false, message: "teacherId is required" });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ success: false, message: "Teacher not found" });
    }

    const cls = await Class.findByIdAndUpdate(
      id,
      { classTeacher: teacherId, updatedBy: req.user?.data?.enrollmentNo || "admin" },
      { new: true }
    )
      .populate("classTeacher", "name enrollmentNo email contact department designation")
      .populate("subjects.subject", "name code description")
      .populate("subjects.teacher", "name enrollmentNo email department");

    if (!cls) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }

    return res.json({ success: true, message: "Class teacher assigned", class: cls });
  } catch (error) {
    console.error("Error assigning class teacher:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

// Set subject-teacher assignments for class (admin only)
exports.setClassSubjects = async (req, res) => {
  try {
    const { id } = req.params;
    const { subjects } = req.body; // [{ subjectId, teacherId, hoursPerWeek }]

    if (!Array.isArray(subjects)) {
      return res.status(400).json({ success: false, message: "subjects must be an array" });
    }

    // Validate all items
    for (const item of subjects) {
      if (!item?.subjectId || !item?.teacherId || !item?.hoursPerWeek) {
        return res.status(400).json({ success: false, message: "Each subject item requires subjectId, teacherId, hoursPerWeek" });
      }
      const [subject, teacher] = await Promise.all([
        Subject.findById(item.subjectId),
        Teacher.findById(item.teacherId),
      ]);
      if (!subject) {
        return res.status(404).json({ success: false, message: `Subject not found: ${item.subjectId}` });
      }
      if (!teacher) {
        return res.status(404).json({ success: false, message: `Teacher not found: ${item.teacherId}` });
      }
      if (Number(item.hoursPerWeek) <= 0) {
        return res.status(400).json({ success: false, message: "hoursPerWeek must be > 0" });
      }
    }

    const mapped = subjects.map((s) => ({
      subject: s.subjectId,
      teacher: s.teacherId,
      hoursPerWeek: Number(s.hoursPerWeek),
    }));

    const cls = await Class.findByIdAndUpdate(
      id,
      { subjects: mapped, updatedBy: req.user?.data?.enrollmentNo || "admin" },
      { new: true }
    )
      .populate("classTeacher", "name enrollmentNo email contact department designation")
      .populate("subjects.subject", "name code description")
      .populate("subjects.teacher", "name enrollmentNo email department");

    if (!cls) {
      return res.status(404).json({ success: false, message: "Class not found" });
    }

    return res.json({ success: true, message: "Subjects updated", class: cls });
  } catch (error) {
    console.error("Error setting class subjects:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

// Generate default classes for an academic year (admin only)
exports.generateDefaultClasses = async (req, res) => {
  try {
    const { academicYear = "2025-2026", sections = ["A","B","C","D","E","F"], grades } = req.body || {};
    const gradeNames = grades && Array.isArray(grades) && grades.length > 0
      ? grades
      : ["Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

    // Ensure placeholder teacher exists
    let placeholder = await Teacher.findOne({ enrollmentNo: "UNASSIGNED-TEACHER" });
    if (!placeholder) {
      placeholder = await Teacher.create({
        enrollmentNo: "UNASSIGNED-TEACHER",
        name: "Unassigned Teacher",
        email: "unassigned@school.local",
        contact: "0000000000",
        gender: "Other",
        status: "Active",
        isFirstLogin: false,
      });
    }

    const created = [];
    const skipped = [];
    for (const grade of gradeNames) {
      for (const section of sections) {
        const existing = await Class.findOne({ name: grade, section, academicYear });
        if (existing) {
          skipped.push({ name: grade, section });
          continue;
        }
        const cls = new Class({
          name: grade,
          section,
          academicYear,
          classTeacher: placeholder._id,
          subjects: [],
          room: `R-${grade}-${section}`,
          schedule: "TBD",
          capacity: 40,
          createdBy: req.user?.data?.enrollmentNo || "admin",
        });
        const saved = await cls.save();
        created.push(saved);
      }
    }

    return res.status(201).json({
      success: true,
      message: "Class generation completed",
      academicYear,
      created: created.length,
      skipped: skipped.length,
      details: {
        created: created.map((c) => ({ id: c._id, name: c.name, section: c.section })),
        skipped,
      },
    });
  } catch (error) {
    console.error("Error generating default classes:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
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

// Bulk upload classes (Admin only)
exports.bulkUploadClasses = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "CSV file is required" });
    }

    // Helper to normalize headers
    const sanitizeHeader = (header) =>
      String(header)
        .toLowerCase()
        .replace(/['`’]/g, "")
        .replace(/[^a-z0-9]/g, "");

    // Map a raw row into canonical keys
    const mapRow = (row) => {
      const out = {};
      for (const [k, v] of Object.entries(row || {})) {
        const key = sanitizeHeader(k);
        const value = typeof v === "string" ? v.trim() : v;
        if (key === "classname" || key === "class") out.name = value;
        else if (key === "section") out.section = value;
        else if (key === "academicyear" || key === "session") out.academicYear = value;
        else if (key === "room" || key === "roomnumber") out.room = value;
        else if (key === "capacity") out.capacity = Number(value);
        else if (key === "classteacher" || key === "classteachername") out.classTeacherName = value;
        else if (key === "schedule") out.schedule = value;
        else if (key === "subjects") out.subjectsText = value; // optional informational
      }
      return out;
    };

    const parsed = await parseCSV(req.file.path);
    const total = parsed.length;
    const savedClasses = [];
    const failedClasses = [];

    for (let i = 0; i < parsed.length; i++) {
      const row = parsed[i];
      const rowNumber = i + 2; // account for header row
      try {
        const mapped = mapRow(row);
        const required = ["name", "section", "academicYear", "room", "capacity", "classTeacherName"];
        const missing = required.filter((f) => !mapped[f] && mapped[f] !== 0);
        if (missing.length) {
          throw new Error(`Missing required field(s): ${missing.join(", ")}`);
        }

        // Validate teacher by name (case-insensitive exact match)
        const teacher = await Teacher.findOne({ name: { $regex: `^${mapped.classTeacherName}$`, $options: "i" } });
        if (!teacher) {
          throw new Error(`Class teacher not found: ${mapped.classTeacherName}`);
        }

        // Check for duplicate class for same academic year
        const existing = await Class.findOne({ name: mapped.name, section: mapped.section, academicYear: mapped.academicYear });
        if (existing) {
          throw new Error(`Class already exists for ${mapped.name}-${mapped.section} (${mapped.academicYear})`);
        }

        // Build subjects array by resolving subject names; assign class teacher by default
        const subjects = [];
        if (mapped.subjectsText) {
          const subjectNames = String(mapped.subjectsText)
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
          for (const subjName of subjectNames) {
            const subjDoc = await Subject.findOne({ name: { $regex: `^${subjName}$`, $options: 'i' } });
            if (subjDoc) {
              subjects.push({
                subject: subjDoc._id,
                teacher: teacher._id,
                hoursPerWeek: 4,
              });
            } else {
              // If subject not found, skip linking for this one
              console.warn(`Subject not found while linking to class ${mapped.name}-${mapped.section}: ${subjName}`);
            }
          }
        }

        const newClass = new Class({
          name: mapped.name,
          section: mapped.section,
          academicYear: mapped.academicYear,
          classTeacher: teacher._id,
          subjects,
          room: mapped.room,
          schedule: mapped.schedule || "",
          capacity: Number.isFinite(mapped.capacity) ? mapped.capacity : parseInt(mapped.capacity, 10) || 0,
          createdBy: req.user?.enrollmentNo || "admin",
        });

        const saved = await newClass.save();
        savedClasses.push({ row: rowNumber, class: saved });
      } catch (err) {
        failedClasses.push({ row: rowNumber, reason: err.message, data: row });
      }
    }

    // Clean up uploaded file
    try { fs.unlinkSync(req.file.path); } catch (_) {}

    return res.status(200).json({
      message: "Class bulk upload completed",
      total,
      successful: savedClasses.length,
      failed: failedClasses.length,
      savedClasses,
      failedClasses,
    });
  } catch (error) {
    console.error("Error during class bulk upload:", error);
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};