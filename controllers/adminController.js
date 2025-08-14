const Student = require("../models/studentData");
const Teacher = require("../models/teacherModel");
const Class = require("../models/classModel");
const FeeCollection = require("../models/feeCollection");
const Attendance = require("../models/attendanceModel");

function getMonthKey(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function lastNMonthsLabels(n) {
  const labels = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(d.toLocaleString("en-US", { month: "short" }));
  }
  return labels;
}

module.exports.getDashboardSummary = async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Core counts
    const [totalStudents, totalStaff, totalClasses] = await Promise.all([
      Student.countDocuments(),
      Teacher.countDocuments(),
      Class.countDocuments(),
    ]);

    // Fee summary (revenue)
    const feeAgg = await FeeCollection.aggregate([
      {
        $group: {
          _id: null,
          totalPaid: { $sum: "$paidAmount" },
          totalPending: { $sum: "$pendingAmount" },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]);
    const feeSummary = feeAgg[0] || { totalPaid: 0, totalPending: 0, totalAmount: 0 };

    // Today's attendance distribution
    const attendanceToday = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: startOfToday, $lt: endOfToday },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);
    const attendanceMap = attendanceToday.reduce((acc, cur) => {
      acc[cur._id] = cur.count;
      return acc;
    }, {});
    const present = attendanceMap["Present"] || 0;
    const absent = attendanceMap["Absent"] || 0;
    const late = attendanceMap["Late"] || 0;

    // Students & Staff over last 6 months
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({
        key: getMonthKey(d),
        start: new Date(d.getFullYear(), d.getMonth(), 1),
        end: new Date(d.getFullYear(), d.getMonth() + 1, 1),
      });
    }

    const studentCounts = await Promise.all(
      months.map((m) =>
        Student.countDocuments({ createdAt: { $gte: m.start, $lt: m.end } })
      )
    );
    const staffCounts = await Promise.all(
      months.map((m) =>
        Teacher.countDocuments({ createdAt: { $gte: m.start, $lt: m.end } })
      )
    );
    const monthsLabels = lastNMonthsLabels(6);

    // Attendance percentage over last 4 weeks
    const weekPoints = [];
    for (let i = 3; i >= 0; i--) {
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i * 7);
      const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 6);
      weekPoints.push({ start, end });
    }
    const weeklyAttendance = [];
    for (const w of weekPoints) {
      const perWeek = await Attendance.aggregate([
        { $match: { date: { $gte: w.start, $lte: w.end } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);
      const map = perWeek.reduce((acc, cur) => {
        acc[cur._id] = cur.count;
        return acc;
      }, {});
      const total = Object.values(map).reduce((a, b) => a + b, 0);
      const pct = total > 0 ? Math.round(((map["Present"] || 0) / total) * 100) : 0;
      weeklyAttendance.push(pct);
    }

    // Recent activity (simple): last 5 students created
    const recentStudents = await Student.find({}, { firstName: 1, lastName: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .limit(5);
    const recentActivity = recentStudents.map((s) => ({
      action: "New student enrolled",
      name: `${s.firstName} ${s.lastName}`,
      time: s.createdAt,
      type: "student",
    }));

    return res.json({
      stats: {
        totalStudents,
        totalStaff,
        totalClasses,
        revenue: feeSummary.totalPaid,
        attendanceToday: { present, absent, late },
      },
      charts: {
        bar: { labels: monthsLabels, students: studentCounts, staff: staffCounts },
        doughnut: { present, absent, late },
        line: { weeks: ["W-3", "W-2", "W-1", "This Week"], attendancePct: weeklyAttendance },
      },
      recentActivity,
    });
  } catch (error) {
    console.error("Error building admin dashboard:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};


