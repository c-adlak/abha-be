const Subject = require("../models/subjectModel");
const Class = require("../models/classModel");

// Get all subjects
exports.getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find().sort({ grade: 1, name: 1 });
    res.json({ success: true, subjects });
  } catch (error) {
    console.error("Error fetching subjects:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

// Get subject by id
exports.getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ success: false, message: "Subject not found" });
    res.json({ success: true, subject });
  } catch (error) {
    console.error("Error fetching subject:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

// Get unique subjects taught by a teacher (via Class.subjects)
exports.getSubjectsByTeacher = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const classes = await Class.find({ "subjects.teacher": teacherId }, { subjects: 1 })
      .populate("subjects.subject", "name code grade hoursPerWeek")
      .lean();
    const subjectMap = new Map();
    for (const cls of classes) {
      for (const s of cls.subjects || []) {
        if (String(s.teacher) === String(teacherId) && s.subject && s.subject._id) {
          subjectMap.set(String(s.subject._id), s.subject);
        }
      }
    }
    res.json({ success: true, subjects: Array.from(subjectMap.values()) });
  } catch (error) {
    console.error("Error fetching subjects by teacher:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

// Get subjects for a class (returns class.subjects with population)
exports.getSubjectsByClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const cls = await Class.findById(classId)
      .populate("subjects.subject", "name code grade hoursPerWeek")
      .populate("subjects.teacher", "name enrollmentNo")
      .lean();
    if (!cls) return res.status(404).json({ success: false, message: "Class not found" });
    res.json({ success: true, class: { _id: cls._id, name: cls.name, section: cls.section }, subjects: cls.subjects || [] });
  } catch (error) {
    console.error("Error fetching subjects by class:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

const { parseCSV } = require("../utils/csvUtils");
const fs = require("fs");

// Get all subjects (duplicate removed; using the top definition)

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

// Bulk upload subjects (Admin only)
exports.bulkUploadSubjects = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "CSV file is required" });
    }

    const parsed = await parseCSV(req.file.path);
    const total = parsed.length;
    const savedSubjects = [];
    const failedSubjects = [];

    // Normalize headers
    const sanitize = (h) => String(h).toLowerCase().replace(/['`’]/g, '').replace(/[^a-z0-9]/g, '');
    const mapRow = (row) => {
      const out = {};
      for (const [k, v] of Object.entries(row || {})) {
        const key = sanitize(k);
        const value = typeof v === 'string' ? v.trim() : v;
        if (key === 'name') out.name = value;
        else if (key === 'code') out.code = value;
        else if (key === 'description') out.description = value;
        else if (key === 'grade') out.grade = value;
        else if (key === 'hoursperweek' || key === 'hours') out.hoursPerWeek = Number(value);
      }
      return out;
    };

    for (let i = 0; i < parsed.length; i++) {
      const raw = parsed[i];
      const rowNumber = i + 2;
      try {
        const row = mapRow(raw);
        const required = ['name','code','description','grade','hoursPerWeek'];
        const missing = required.filter((f) => !row[f] && row[f] !== 0);
        if (missing.length) throw new Error(`Missing required field(s): ${missing.join(', ')}`);

        // Check uniqueness by code
        const existing = await Subject.findOne({ code: row.code });
        if (existing) throw new Error(`Subject with code ${row.code} already exists`);

        const subject = new Subject({
          name: row.name,
          code: row.code,
          description: row.description,
          grade: row.grade,
          hoursPerWeek: Number(row.hoursPerWeek),
          createdBy: req.user?.enrollmentNo || 'admin',
        });

        const saved = await subject.save();
        savedSubjects.push({ row: rowNumber, subject: saved });
      } catch (err) {
        failedSubjects.push({ row: rowNumber, reason: err.message, data: raw });
      }
    }

    try { fs.unlinkSync(req.file.path); } catch (_) {}

    return res.status(200).json({
      message: 'Subject bulk upload completed',
      total,
      successful: savedSubjects.length,
      failed: failedSubjects.length,
      savedSubjects,
      failedSubjects,
    });
  } catch (error) {
    console.error('Error during subject bulk upload:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};