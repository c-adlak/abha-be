const Exam = require("../models/examModel");
const ExamResult = require("../models/examResultModel");
const Class = require("../models/classModel");
const Subject = require("../models/subjectModel");
const Teacher = require("../models/teacherModel");
const Student = require("../models/studentData");
const { parseCSV } = require("../utils/csvUtils");
const { canAccessExamResults } = require("../utils/feeUtils");

// Get all exams (admin only)
exports.getAllExams = async (req, res) => {
  try {
    const exams = await Exam.find()
      .populate("subject", "name code")
      .populate("class", "name section academicYear")
      .populate("teacher", "name enrollmentNo email")
      .sort({ examDate: -1 });

    res.json({
      success: true,
      exams,
    });
  } catch (error) {
    console.error("Error fetching exams:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get student's exams with fee dues check
exports.getStudentExams = async (req, res) => {
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

    // Check if student can access exam results based on fee payment
    const accessCheck = await canAccessExamResults(studentId, student.academicYear);
    
    // Find the class where this student is enrolled
    const classData = await Class.findOne({
      students: studentId,
      academicYear: student.academicYear,
    });

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found for this student",
      });
    }

    // Get exams for this class
    const exams = await Exam.find({ class: classData._id })
      .populate("subject", "name code")
      .populate("class", "name section")
      .populate("teacher", "name enrollmentNo")
      .sort({ examDate: -1 });

    // Get exam results for this student (only if fees are paid)
    let examResults = [];
    if (accessCheck.canAccess) {
      examResults = await ExamResult.find({ student: studentId })
        .populate("exam", "title subject examDate totalMarks")
        .populate("exam.subject", "name code")
        .sort({ "exam.examDate": -1 });
    }

    res.json({
      success: true,
      exams,
      examResults,
      feeStatus: {
        canAccessResults: accessCheck.canAccess,
        reason: accessCheck.reason
      }
    });
  } catch (error) {
    console.error("Error fetching student exams:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get teacher's exams
exports.getTeacherExams = async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    // Get exams where this teacher is the assigned teacher
    const exams = await Exam.find({ teacher: teacherId })
      .populate("subject", "name code")
      .populate("class", "name section")
      .populate("teacher", "name enrollmentNo")
      .sort({ examDate: -1 });

    res.json({
      success: true,
      exams,
    });
  } catch (error) {
    console.error("Error fetching teacher exams:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get exam by ID
exports.getExamById = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findById(id)
      .populate("subject", "name code description")
      .populate("class", "name section")
      .populate("teacher", "name enrollmentNo email");

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    res.json({
      success: true,
      exam,
    });
  } catch (error) {
    console.error("Error fetching exam:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Create new exam (admin only)
exports.createExam = async (req, res) => {
  try {
    const {
      title,
      subject,
      class: classId,
      teacher,
      examDate,
      startTime,
      endTime,
      duration,
      totalMarks,
      room,
      examType,
      instructions,
    } = req.body;

    // Validate required fields
    if (!title || !subject || !classId || !teacher || !examDate || !startTime || !endTime || !duration || !totalMarks || !room || !examType) {
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Validate subject exists
    const subjectData = await Subject.findById(subject);
    if (!subjectData) {
      return res.status(400).json({
        success: false,
        message: "Subject not found",
      });
    }

    // Validate class exists
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(400).json({
        success: false,
        message: "Class not found",
      });
    }

    // Validate teacher exists
    const teacherData = await Teacher.findById(teacher);
    if (!teacherData) {
      return res.status(400).json({
        success: false,
        message: "Teacher not found",
      });
    }

    const newExam = new Exam({
      title,
      subject,
      class: classId,
      teacher,
      examDate,
      startTime,
      endTime,
      duration,
      totalMarks,
      room,
      examType,
      instructions,
      createdBy: req.user?.enrollmentNo || "admin",
    });

    const savedExam = await newExam.save();

    res.status(201).json({
      success: true,
      message: "Exam created successfully",
      exam: savedExam,
    });
  } catch (error) {
    console.error("Error creating exam:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Update exam (admin only)
exports.updateExam = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    const updatedExam = await Exam.findByIdAndUpdate(
      id,
      {
        ...updateData,
        updatedBy: req.user?.enrollmentNo || "admin",
      },
      { new: true }
    )
      .populate("subject", "name code")
      .populate("class", "name section")
      .populate("teacher", "name enrollmentNo");

    res.json({
      success: true,
      message: "Exam updated successfully",
      exam: updatedExam,
    });
  } catch (error) {
    console.error("Error updating exam:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Delete exam (admin only)
exports.deleteExam = async (req, res) => {
  try {
    const { id } = req.params;

    const exam = await Exam.findById(id);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // Check if exam has results
    const examResults = await ExamResult.find({ exam: id });
    if (examResults.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete exam with existing results",
      });
    }

    await Exam.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Exam deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting exam:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Submit exam result (teacher only)
exports.submitExamResult = async (req, res) => {
  try {
    const {
      examId,
      studentId,
      marksObtained,
      totalMarks,
      percentage,
      grade,
      remarks,
      isAbsent,
    } = req.body;

    // Validate required fields
    if (!examId || !studentId || !totalMarks) {
      return res.status(400).json({
        success: false,
        message: "Exam ID, Student ID, and Total Marks are required",
      });
    }

    // Check if result already exists
    const existingResult = await ExamResult.findOne({
      exam: examId,
      student: studentId,
    });

    if (existingResult) {
      return res.status(400).json({
        success: false,
        message: "Exam result already exists for this student",
      });
    }

    // Validate exam exists
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(400).json({
        success: false,
        message: "Exam not found",
      });
    }

    // Validate student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(400).json({
        success: false,
        message: "Student not found",
      });
    }

    const newResult = new ExamResult({
      exam: examId,
      student: studentId,
      marksObtained: isAbsent ? 0 : marksObtained,
      totalMarks,
      percentage: isAbsent ? 0 : percentage,
      grade: isAbsent ? "ABSENT" : grade,
      remarks,
      isAbsent,
      submittedBy: req.user?.enrollmentNo || "teacher",
    });

    const savedResult = await newResult.save();

    res.status(201).json({
      success: true,
      message: "Exam result submitted successfully",
      result: savedResult,
    });
  } catch (error) {
    console.error("Error submitting exam result:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get exam results for an exam with fee dues check
exports.getExamResults = async (req, res) => {
  try {
    const { examId } = req.params;
    const { studentId } = req.query; // Optional: filter by specific student

    let query = { exam: examId };
    
    // If studentId is provided, check fee dues for that specific student
    if (studentId) {
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      const accessCheck = await canAccessExamResults(studentId, student.academicYear);
      if (!accessCheck.canAccess) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
          reason: accessCheck.reason
        });
      }

      query.student = studentId;
    }

    const results = await ExamResult.find(query)
      .populate("student", "firstName lastName enrollmentNo rollNo")
      .populate("exam", "title subject examDate totalMarks")
      .populate("exam.subject", "name code")
      .sort({ "student.firstName": 1 });

    res.json({
      success: true,
      results,
      feeStatus: studentId ? {
        canAccessResults: true,
        reason: "Fees verified"
      } : null
    });
  } catch (error) {
    console.error("Error fetching exam results:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Get student's exam results with fee dues check
exports.getStudentExamResults = async (req, res) => {
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

    // Check if student can access exam results based on fee payment
    const accessCheck = await canAccessExamResults(studentId, student.academicYear);
    
    if (!accessCheck.canAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
        reason: accessCheck.reason
      });
    }

    // Get exam results for this student
    const examResults = await ExamResult.find({ student: studentId })
      .populate("exam", "title subject examDate totalMarks examType")
      .populate("exam.subject", "name code")
      .sort({ "exam.examDate": -1 });

    res.json({
      success: true,
      examResults,
      feeStatus: {
        canAccessResults: true,
        reason: accessCheck.reason
      }
    });
  } catch (error) {
    console.error("Error fetching student exam results:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}; 

// Bulk upload exams (Admin only)
exports.bulkUploadExams = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "CSV file is required" });
    }

    // Helpers
    const sanitize = (h) => String(h).toLowerCase().replace(/['`’]/g, '').replace(/[^a-z0-9]/g, '');
    const mapRow = (row) => {
      const out = {};
      for (const [k, v] of Object.entries(row || {})) {
        const key = sanitize(k);
        const value = typeof v === 'string' ? v.trim() : v;
        if (key === 'title') out.title = value;
        else if (key === 'subject') out.subjectName = value;
        else if (key === 'class' || key === 'classname') out.className = value;
        else if (key === 'teacher') out.teacherName = value;
        else if (key === 'examdate' || key === 'date') out.examDate = value;
        else if (key === 'starttime') out.startTime = value;
        else if (key === 'endtime') out.endTime = value;
        else if (key === 'duration') out.duration = Number(value);
        else if (key === 'totalmarks') out.totalMarks = Number(value);
        else if (key === 'room') out.room = value;
        else if (key === 'examtype' || key === 'type') out.examType = value;
        else if (key === 'instructions') out.instructions = value;
      }
      return out;
    };

    const parsed = await parseCSV(req.file.path);
    const total = parsed.length;
    const savedExams = [];
    const failedExams = [];

    const normalizeExamType = (val) => {
      const v = String(val || '').trim().toLowerCase();
      if (v === 'midterm' || v === 'mid term') return 'Mid Term';
      if (v === 'final' || v === 'final term') return 'Final Term';
      if (v === 'quiz' || v === 'unit test' || v === 'unittest' || v === 'unit-test') return 'Unit Test';
      if (v === 'practical') return 'Practical';
      if (v === 'assignment') return 'Assignment';
      return val; // leave as is; mongoose will validate
    };

    for (let i = 0; i < parsed.length; i++) {
      const raw = parsed[i];
      const rowNumber = i + 2;
      try {
        const row = mapRow(raw);
        const required = ['title','subjectName','className','examDate','startTime','endTime','duration','totalMarks','room','examType'];
        const missing = required.filter((f) => !row[f] && row[f] !== 0);
        if (missing.length) throw new Error(`Missing required field(s): ${missing.join(', ')}`);

        // Look up subject by name
        const subject = await Subject.findOne({ name: { $regex: `^${row.subjectName}$`, $options: 'i' } });
        if (!subject) throw new Error(`Subject not found: ${row.subjectName}`);

        // Look up class by name only (pick latest academic year if multiple)
        const classDoc = await Class.findOne({ name: row.className }).sort({ academicYear: -1 });
        if (!classDoc) throw new Error(`Class not found: ${row.className}`);

        // Teacher optional; try lookup if provided
        let teacherId = undefined;
        if (row.teacherName) {
          const teacher = await Teacher.findOne({ name: { $regex: `^${row.teacherName}$`, $options: 'i' } });
          if (!teacher) throw new Error(`Teacher not found: ${row.teacherName}`);
          teacherId = teacher._id;
        }

        const exam = new Exam({
          title: row.title,
          subject: subject._id,
          class: classDoc._id,
          teacher: teacherId,
          examDate: new Date(row.examDate),
          startTime: row.startTime,
          endTime: row.endTime,
          duration: Number(row.duration),
          totalMarks: Number(row.totalMarks),
          room: row.room,
          examType: normalizeExamType(row.examType),
          instructions: row.instructions || '',
          createdBy: req.user?.enrollmentNo || 'admin',
        });

        const saved = await exam.save();
        savedExams.push({ row: rowNumber, exam: saved });
      } catch (err) {
        failedExams.push({ row: rowNumber, reason: err.message, data: raw });
      }
    }

    // Cleanup
    try { require('fs').unlinkSync(req.file.path); } catch (_) {}

    return res.status(200).json({
      message: 'Exam bulk upload completed',
      total,
      successful: savedExams.length,
      failed: failedExams.length,
      savedExams,
      failedExams,
    });
  } catch (error) {
    console.error('Error during exam bulk upload:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};