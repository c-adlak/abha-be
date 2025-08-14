const Timetable = require("../models/timetableModel");
const Class = require("../models/classModel");
const Subject = require("../models/subjectModel");
const Teacher = require("../models/teacherModel");
const { parseCSV } = require("../utils/csvUtils");
const fs = require("fs");

// Bulk upload timetable (Admin only)
exports.bulkUploadTimetable = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "CSV file is required" });

    const parsed = await parseCSV(req.file.path);
    const total = parsed.length;
    const saved = [];
    const failed = [];

    const sanitize = (h) => String(h).toLowerCase().replace(/['`’]/g, '').replace(/[^a-z0-9]/g, '');

    // Expected CSV columns per row: Class, Section (optional), Academic Year, Day, Time, Subject, Teacher, Room
    const mapRow = (row) => {
      const out = {};
      for (const [k, v] of Object.entries(row || {})) {
        const key = sanitize(k);
        const value = typeof v === 'string' ? v.trim() : v;
        if (key === 'class' || key === 'classname') out.className = value;
        else if (key === 'section') out.section = value;
        else if (key === 'academicyear' || key === 'session') out.academicYear = value;
        else if (key === 'day') out.day = value; // Monday..Saturday
        else if (key === 'time' || key === 'timeslot') out.time = value; // e.g. 9:00 AM - 9:45 AM
        else if (key === 'subject') out.subjectName = value;
        else if (key === 'teacher') out.teacherName = value;
        else if (key === 'room') out.room = value;
      }
      return out;
    };

    const toTitleCase = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;

    for (let i = 0; i < parsed.length; i++) {
      const raw = parsed[i];
      const rowNumber = i + 2;
      try {
        const row = mapRow(raw);
        const required = ['className','academicYear','day','time','subjectName','teacherName','room'];
        const missing = required.filter((f) => !row[f]);
        if (missing.length) throw new Error(`Missing required field(s): ${missing.join(', ')}`);

        const classQuery = { name: row.className, academicYear: row.academicYear };
        if (row.section) classQuery.section = row.section;
        const classDoc = await Class.findOne(classQuery);
        if (!classDoc) throw new Error(`Class not found: ${row.className}${row.section ? ' (' + row.section + ')' : ''} (${row.academicYear})`);

        const subject = await Subject.findOne({ name: { $regex: `^${row.subjectName}$`, $options: 'i' } });
        if (!subject) throw new Error(`Subject not found: ${row.subjectName}`);

        const teacher = await Teacher.findOne({ name: { $regex: `^${row.teacherName}$`, $options: 'i' } });
        if (!teacher) throw new Error(`Teacher not found: ${row.teacherName}`);

        const dayKey = toTitleCase(row.day);
        const entry = { time: row.time, subject: subject._id, teacher: teacher._id, room: row.room };

        // Upsert timetable for class + academicYear
        let timetable = await Timetable.findOne({ class: classDoc._id, academicYear: row.academicYear });
        if (!timetable) {
          timetable = new Timetable({ class: classDoc._id, academicYear: row.academicYear, schedule: {} });
        }
        const currentDay = Array.isArray(timetable.schedule[dayKey]) ? timetable.schedule[dayKey] : [];
        currentDay.push(entry);
        timetable.schedule[dayKey] = currentDay;
        await timetable.save();
        saved.push({ row: rowNumber, class: classDoc._id, day: dayKey });
      } catch (err) {
        failed.push({ row: rowNumber, reason: err.message, data: raw });
      }
    }

    try { fs.unlinkSync(req.file.path); } catch (_) {}

    return res.status(200).json({
      message: 'Timetable bulk upload completed',
      total,
      successful: saved.length,
      failed: failed.length,
      saved,
      failed,
    });
  } catch (error) {
    console.error('Error during timetable bulk upload:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

// Upsert a single timetable entry for a class/day/time
exports.upsertEntry = async (req, res) => {
  try {
    const { classId, academicYear, day, time, subjectId, subjectName, teacherId, teacherName, room } = req.body || {};
    if (!classId || !day || !time || !room || (!subjectId && !subjectName) || (!teacherId && !teacherName)) {
      return res.status(400).json({ message: 'classId, day, time, room, subject and teacher are required' });
    }

    const classDoc = await Class.findById(classId);
    if (!classDoc) return res.status(404).json({ message: 'Class not found' });

    const resolvedSubject = subjectId
      ? await Subject.findById(subjectId)
      : await Subject.findOne({ name: { $regex: `^${subjectName}$`, $options: 'i' } });
    if (!resolvedSubject) return res.status(400).json({ message: 'Subject not found' });

    const resolvedTeacher = teacherId
      ? await Teacher.findById(teacherId)
      : await Teacher.findOne({ name: { $regex: `^${teacherName}$`, $options: 'i' } });
    if (!resolvedTeacher) return res.status(400).json({ message: 'Teacher not found' });

    const dayKey = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
    const year = academicYear || classDoc.academicYear;

    let timetable = await Timetable.findOne({ class: classDoc._id, academicYear: year });
    if (!timetable) {
      timetable = new Timetable({ class: classDoc._id, academicYear: year, schedule: {} });
    }

    const entries = Array.isArray(timetable.schedule[dayKey]) ? timetable.schedule[dayKey] : [];
    const idx = entries.findIndex((e) => e.time === time);
    const newEntry = { time, subject: resolvedSubject._id, teacher: resolvedTeacher._id, room };
    if (idx >= 0) entries[idx] = newEntry; else entries.push(newEntry);
    timetable.schedule[dayKey] = entries;
    await timetable.save();

    return res.status(200).json({ message: 'Timetable entry upserted successfully' });
  } catch (error) {
    console.error('Error upserting timetable entry:', error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

