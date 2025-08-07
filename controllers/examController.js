const Exam = require("../models/examModel");
const ExamResult = require("../models/examResultModel");
const Class = require("../models/classModel");
const Subject = require("../models/subjectModel");
const Teacher = require("../models/teacherModel");
const Student = require("../models/studentData");

// Get all exams (admin only)
exports.getAllExams = async (req, res) => {
  try {
    const exams = await Exam.find()
      .populate("subject", "name code")
      .populate("class", "name section")
      .populate("teacher", "name enrollmentNo")
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

// Get student's exams
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

    // Get exam results for this student
    const examResults = await ExamResult.find({ student: studentId })
      .populate("exam", "title subject examDate totalMarks")
      .populate("exam.subject", "name code")
      .sort({ "exam.examDate": -1 });

    res.json({
      success: true,
      exams,
      examResults,
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

// Get exam results for an exam
exports.getExamResults = async (req, res) => {
  try {
    const { examId } = req.params;

    const results = await ExamResult.find({ exam: examId })
      .populate("student", "firstName lastName enrollmentNo rollNo")
      .populate("exam", "title subject examDate totalMarks")
      .populate("exam.subject", "name code")
      .sort({ "student.firstName": 1 });

    res.json({
      success: true,
      results,
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