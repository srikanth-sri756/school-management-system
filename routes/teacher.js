// Teacher Portal: dashboard, attendance, marks, remarks, notes and question papers for
// the signed-in teacher's own class. Every page and action works only on that class's
// students and on the teacher's own notes and papers.
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const router = express.Router();
const { uploadAnswerSheet, uploadNote, uploadQuestionPaper, withUploadErrors, uploadsDir } = require('../config/multer');
const { sendStoredFile, removeStoredFile } = require('../config/file-store');
const { withImportantDates } = require('../middleware/important-dates');
const { localDayKey, dayKey, longDay } = require('../config/dates');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const Mark = require('../models/Mark');
const Remark = require('../models/Remark');
const Note = require('../models/Note');
const TestPaper = require('../models/TestPaper');
const Holiday = require('../models/Holiday');

// Choices shown in the forms (exam types match the admin Marks page)
const EXAM_TYPES = ['Quiz', 'Unit Test', 'Mid-term', 'Final', 'Assignment'];
const PAPER_TYPES = TestPaper.schema.path('examType').enumValues;
const ATTENDANCE_STATUSES = ['Present', 'Late', 'Absent'];
const REMARK_TYPES = ['Positive', 'Neutral', 'Negative'];

const validId = (id) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);

// Express 4 does not catch errors thrown by async handlers
const page = (handler) => (req, res, next) => handler(req, res, next).catch(next);
// Form actions: on an unexpected error, flash a message and go back to `fallback`
const action = (fallback, handler) => async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    console.error(`Teacher portal ${req.method} ${req.originalUrl}:`, error);
    req.flash('error', 'Something went wrong. Please try again.');
    res.redirect(fallback);
  }
};

// Deletes an uploaded file: the copy in MongoDB, and an older copy on disk if there is one
const removeFile = (filename, legacyPath) => { if (filename || legacyPath) removeStoredFile(filename, [legacyPath]); };
const discard = (file) => { if (file) removeFile(file.filename); };
const legacyUpload = (filename) => (filename ? path.join(uploadsDir, path.basename(filename)) : null);

const gradeFor = (percentage) => (
  percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B+'
    : percentage >= 60 ? 'B' : percentage >= 50 ? 'C' : percentage >= 40 ? 'D' : 'F'
);

// A reason attendance can't be taken on a "YYYY-MM-DD" day, or null
async function closedReason(day) {
  const start = new Date(`${day}T00:00:00`);
  if (start.getDay() === 0) return 'This day is a Sunday (weekly off).';
  const end = new Date(`${day}T23:59:59.999`);
  const holiday = await Holiday.findOne({ date: { $gte: start, $lte: end } }).lean();
  return holiday ? `This day is a holiday: ${holiday.title}.` : null;
}

// Active students of the teacher's class, by roll number
async function classStudents(teacher) {
  if (!teacher.class) return [];
  const students = await Student.find({ class: teacher.class._id, status: 'Active' });
  const roll = (s) => parseInt(s.rollNumber, 10);
  return students.sort((a, b) => (roll(a) || Infinity) - (roll(b) || Infinity) || String(a.rollNumber).localeCompare(String(b.rollNumber)));
}

// ---------------------------------------------------------------------------
// Access: signed-in teachers whose login is linked to a teacher profile
// ---------------------------------------------------------------------------
router.use((req, res, next) => {
  if (req.session.user && req.session.user.role === 'teacher') return next();
  res.redirect('/login');
});

router.use(page(async (req, res, next) => {
  const teacher = await Teacher.findOne({ user: req.session.user.id }).populate('class subject');
  if (!teacher) {
    return res.status(403).render('teacher/unlinked', { user: req.session.user, page: '' });
  }
  req.teacher = teacher;
  res.locals.teacher = teacher;
  res.locals.user = req.session.user;
  next();
}));

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
router.get('/dashboard', withImportantDates('teachers', 5), page(async (req, res) => {
  const { teacher } = req;
  const students = await classStudents(teacher);
  const today = localDayKey();
  const todays = students.length
    ? await Attendance.find({ student: { $in: students.map(s => s._id) }, date: today }).lean()
    : [];

  const [notes, papers, remarks, recentRemarks] = await Promise.all([
    Note.countDocuments({ teacher: teacher._id }),
    TestPaper.countDocuments({ teacher: teacher._id }),
    Remark.countDocuments({ teacher: teacher._id }),
    Remark.find({ teacher: teacher._id }).populate('student', 'firstName lastName').sort({ date: -1 }).limit(4).lean()
  ]);

  res.render('teacher/dashboard', {
    page: 'teacher-dashboard',
    stats: { students: students.length, notes, papers, remarks },
    today: {
      label: longDay(today),
      closed: await closedReason(today),
      marked: todays.length,
      present: todays.filter(a => a.status !== 'Absent').length,
      total: students.length
    },
    recentRemarks
  });
}));

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------
router.get('/attendance', page(async (req, res) => {
  const today = localDayKey();
  let day = dayKey(req.query.date) || today;
  if (day > today) day = today;

  const students = await classStudents(req.teacher);
  const records = students.length
    ? await Attendance.find({ student: { $in: students.map(s => s._id) }, date: day }).lean()
    : [];
  const byStudent = Object.fromEntries(records.map(r => [String(r.student), r]));

  res.render('teacher/attendance', {
    page: 'teacher-attendance-portal',
    students,
    records: byStudent,
    day,
    today,
    dayLabel: longDay(day),
    closed: await closedReason(day),
    statuses: ATTENDANCE_STATUSES
  });
}));

router.post('/attendance/mark', action('/teacher/attendance', async (req, res) => {
  const { teacher } = req;
  const day = dayKey(req.body.date);
  const back = `/teacher/attendance${day ? `?date=${day}` : ''}`;

  if (!day || day > localDayKey()) {
    req.flash('error', 'Choose a valid date (today or earlier).');
    return res.redirect('/teacher/attendance');
  }
  const closed = await closedReason(day);
  if (closed) {
    req.flash('error', `${closed} Attendance can’t be marked.`);
    return res.redirect(back);
  }

  const students = await classStudents(teacher);
  const statuses = req.body.status || {};
  const remarks = req.body.remarks || {};
  const writes = students
    .filter(student => ATTENDANCE_STATUSES.includes(statuses[student.id]))
    .map(student => ({
      updateOne: {
        filter: { student: student._id, date: day },
        update: {
          $set: {
            class: teacher.class._id,
            status: statuses[student.id],
            remarks: String(remarks[student.id] || '').trim().slice(0, 200),
            markedBy: req.session.user.id
          }
        },
        upsert: true
      }
    }));

  if (!writes.length) {
    req.flash('error', 'There was no attendance to save.');
    return res.redirect(back);
  }
  await Attendance.bulkWrite(writes);
  req.flash('success', `Attendance saved for ${writes.length} ${writes.length === 1 ? 'student' : 'students'} on ${longDay(day)}.`);
  res.redirect(back);
}));

// ---------------------------------------------------------------------------
// Marks (class teachers add, edit and delete; subject teachers can view)
// ---------------------------------------------------------------------------
async function visibleMarks(teacher, students) {
  if (teacher.isClassTeacher && teacher.class) {
    return Mark.find({ student: { $in: students.map(s => s._id) } }).populate('student subject').sort({ date: -1 }).lean();
  }
  if (teacher.subject) {
    return Mark.find({ subject: teacher.subject._id }).populate({ path: 'student', populate: { path: 'class' } }).populate('subject').sort({ date: -1 }).lean();
  }
  return [];
}

router.get('/marks', page(async (req, res) => {
  const { teacher } = req;
  const students = await classStudents(teacher);
  const subjects = teacher.isClassTeacher ? await Subject.find().sort({ name: 1 }) : (teacher.subject ? [teacher.subject] : []);
  res.render('teacher/marks', {
    page: 'teacher-marks',
    students,
    subjects,
    marks: await visibleMarks(teacher, students),
    examTypes: EXAM_TYPES
  });
}));

// Reads and checks the marks form: { data, error }
async function readMarks(body, teacher) {
  const maxMarks = Number(body.maxMarks);
  const obtainedMarks = Number(body.obtainedMarks);
  if (!validId(body.subject) || !(await Subject.exists({ _id: body.subject }))) return { error: 'Choose a subject.' };
  if (!EXAM_TYPES.includes(body.examType)) return { error: 'Choose an exam type.' };
  if (!(maxMarks > 0)) return { error: 'Maximum marks must be more than 0.' };
  if (!(obtainedMarks >= 0) || obtainedMarks > maxMarks) return { error: `Marks obtained must be between 0 and ${maxMarks}.` };
  const percentage = Math.round((obtainedMarks / maxMarks) * 10000) / 100;
  return {
    data: {
      subject: body.subject,
      examType: body.examType,
      maxMarks,
      obtainedMarks,
      percentage,
      grade: gradeFor(percentage),
      remarks: String(body.remarks || '').trim().slice(0, 500),
      enteredBy: teacher.user
    }
  };
}

const classTeacherOnly = (req, res, next) => {
  if (req.teacher.isClassTeacher && req.teacher.class) return next();
  discard(req.file);
  req.flash('error', 'Only the class teacher can add or change marks.');
  res.redirect('/teacher/marks');
};

// A mark that belongs to one of the teacher's students, or null
async function ownMark(teacher, id) {
  if (!validId(id)) return null;
  const mark = await Mark.findById(id);
  if (!mark) return null;
  const inClass = await Student.exists({ _id: mark.student, class: teacher.class._id });
  return inClass ? mark : null;
}

router.post('/marks/add', withUploadErrors(uploadAnswerSheet.single('answerSheet')), classTeacherOnly, action('/teacher/marks', async (req, res) => {
  const { teacher } = req;
  const inClass = validId(req.body.student) && await Student.exists({ _id: req.body.student, class: teacher.class._id });
  const { data, error } = inClass ? await readMarks(req.body, teacher) : { error: 'Choose a student from your class.' };
  if (error) {
    discard(req.file);
    req.flash('error', error);
    return res.redirect('/teacher/marks');
  }
  if (req.file) data.answerSheetFile = req.file.filename;
  await Mark.create({ ...data, student: req.body.student, date: new Date() });
  req.flash('success', `Marks saved: ${data.obtainedMarks}/${data.maxMarks}, grade ${data.grade}.`);
  res.redirect('/teacher/marks');
}));

router.post('/marks/edit', withUploadErrors(uploadAnswerSheet.single('answerSheet')), classTeacherOnly, action('/teacher/marks', async (req, res) => {
  const mark = await ownMark(req.teacher, req.body.markId);
  const { data, error } = mark ? await readMarks(req.body, req.teacher) : { error: 'That mark entry could not be found.' };
  if (error) {
    discard(req.file);
    req.flash('error', error);
    return res.redirect('/teacher/marks');
  }
  if (req.file) {
    if (mark.answerSheetFile) removeFile(mark.answerSheetFile, legacyUpload(mark.answerSheetFile));
    data.answerSheetFile = req.file.filename;
  }
  mark.set(data);
  await mark.save();
  req.flash('success', `Marks updated: ${data.obtainedMarks}/${data.maxMarks}, grade ${data.grade}.`);
  res.redirect('/teacher/marks');
}));

router.post('/marks/delete/:id', classTeacherOnly, action('/teacher/marks', async (req, res) => {
  const mark = await ownMark(req.teacher, req.params.id);
  if (!mark) {
    req.flash('error', 'That mark entry could not be found.');
    return res.redirect('/teacher/marks');
  }
  if (mark.answerSheetFile) removeFile(mark.answerSheetFile, legacyUpload(mark.answerSheetFile));
  await mark.deleteOne();
  req.flash('success', 'Mark entry deleted.');
  res.redirect('/teacher/marks');
}));

// ---------------------------------------------------------------------------
// Remarks
// ---------------------------------------------------------------------------
router.get('/remarks', page(async (req, res) => {
  const { teacher } = req;
  res.render('teacher/remarks', {
    page: 'teacher-remarks',
    students: await classStudents(teacher),
    remarks: await Remark.find({ teacher: teacher._id }).populate('student subject').sort({ date: -1 }).lean(),
    remarkTypes: REMARK_TYPES
  });
}));

router.post('/remarks/add', action('/teacher/remarks', async (req, res) => {
  const { teacher } = req;
  const remark = String(req.body.remark || '').trim();
  const inClass = teacher.class && validId(req.body.student)
    && await Student.exists({ _id: req.body.student, class: teacher.class._id });

  let error = null;
  if (!inClass) error = 'Choose a student from your class.';
  else if (!REMARK_TYPES.includes(req.body.type)) error = 'Choose the type of remark.';
  else if (!remark) error = 'Write the remark.';
  else if (remark.length > 1000) error = 'Keep the remark to 1000 characters or fewer.';
  if (error) {
    req.flash('error', error);
    return res.redirect('/teacher/remarks');
  }

  await Remark.create({ student: req.body.student, teacher: teacher._id, subject: teacher.subject, remark, type: req.body.type });
  req.flash('success', `${req.body.type} remark added.`);
  res.redirect('/teacher/remarks');
}));

router.post('/remarks/:id/delete', action('/teacher/remarks', async (req, res) => {
  const removed = validId(req.params.id) && await Remark.findOneAndDelete({ _id: req.params.id, teacher: req.teacher._id });
  req.flash(removed ? 'success' : 'error', removed ? 'Remark deleted.' : 'That remark could not be found.');
  res.redirect('/teacher/remarks');
}));

// ---------------------------------------------------------------------------
// Notes (shared with the teacher's class in the Student Portal)
// ---------------------------------------------------------------------------
router.get('/notes', page(async (req, res) => {
  res.render('teacher/notes', {
    page: 'teacher-notes',
    notes: await Note.find({ teacher: req.teacher._id }).populate('subject class').sort({ createdAt: -1 }).lean()
  });
}));

router.post('/notes/add', withUploadErrors(uploadNote.single('attachment')), action('/teacher/notes', async (req, res) => {
  const { teacher } = req;
  const title = String(req.body.title || '').trim();
  const content = String(req.body.content || '').trim();

  let error = null;
  if (!teacher.class) error = 'You need an assigned class before you can share notes. Please ask the office.';
  else if (!title || !content) error = 'Add a title and the note itself.';
  else if (title.length > 150) error = 'Keep the title to 150 characters or fewer.';
  if (error) {
    discard(req.file);
    req.flash('error', error);
    return res.redirect('/teacher/notes');
  }

  const note = {
    title,
    content,
    subject: teacher.subject ? teacher.subject._id : undefined,
    class: teacher.class._id,
    teacher: teacher._id,
    isPublic: req.body.isPublic === 'true'
  };
  if (req.file) {
    note.attachment = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadDate: new Date()
    };
  }
  try {
    await Note.create(note);
  } catch (err) {
    discard(req.file);
    throw err;
  }
  req.flash('success', note.isPublic ? 'Note shared with your class.' : 'Note saved (only you can see it).');
  res.redirect('/teacher/notes');
}));

router.get('/notes/:id/download', action('/teacher/notes', async (req, res) => {
  const note = validId(req.params.id) ? await Note.findOne({ _id: req.params.id, teacher: req.teacher._id }) : null;
  if (!note || !note.attachment || !note.attachment.filename) {
    req.flash('error', 'That file could not be found.');
    return res.redirect('/teacher/notes');
  }
  await sendStoredFile(res, note.attachment.filename, {
    download: true,
    downloadName: note.attachment.originalName,
    legacyPaths: [note.attachment.path]
  });
}));

router.post('/notes/:id/delete', action('/teacher/notes', async (req, res) => {
  const note = validId(req.params.id) ? await Note.findOneAndDelete({ _id: req.params.id, teacher: req.teacher._id }) : null;
  if (!note) {
    req.flash('error', 'That note could not be found.');
    return res.redirect('/teacher/notes');
  }
  if (note.attachment) removeFile(note.attachment.filename, note.attachment.path);
  req.flash('success', 'Note deleted.');
  res.redirect('/teacher/notes');
}));

// ---------------------------------------------------------------------------
// Question papers (shown to the teacher's class in the Student Portal)
// ---------------------------------------------------------------------------
router.get('/test-papers', page(async (req, res) => {
  res.render('teacher/test-papers', {
    page: 'teacher-test-papers',
    testPapers: await TestPaper.find({ teacher: req.teacher._id }).populate('subject class').sort({ date: -1 }).lean(),
    paperTypes: PAPER_TYPES
  });
}));

router.post('/test-papers/add', withUploadErrors(uploadQuestionPaper.single('questionPaper')), action('/teacher/test-papers', async (req, res) => {
  const { teacher } = req;
  const title = String(req.body.title || '').trim();
  const date = dayKey(req.body.date);
  const maxMarks = Number(req.body.maxMarks);

  let error = null;
  if (!teacher.class || !teacher.subject) error = 'You need an assigned class and subject before you can upload papers. Please ask the office.';
  else if (!title) error = 'Add a title for the paper.';
  else if (!date) error = 'Choose the date of the test.';
  else if (!(maxMarks > 0)) error = 'Maximum marks must be more than 0.';
  else if (!PAPER_TYPES.includes(req.body.examType)) error = 'Choose the type of test.';
  else if (!req.file) error = 'Attach the question paper file.';
  if (error) {
    discard(req.file);
    req.flash('error', error);
    return res.redirect('/teacher/test-papers');
  }

  try {
    await TestPaper.create({
      title: title.slice(0, 150),
      subject: teacher.subject._id,
      class: teacher.class._id,
      section: teacher.class.section,
      teacher: teacher._id,
      examType: req.body.examType,
      date,
      maxMarks,
      description: String(req.body.description || '').trim().slice(0, 1000),
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadDate: new Date()
      }
    });
  } catch (err) {
    discard(req.file);
    throw err;
  }
  req.flash('success', 'Question paper uploaded. Your class can now download it.');
  res.redirect('/teacher/test-papers');
}));

router.get('/test-papers/:id/download', action('/teacher/test-papers', async (req, res) => {
  const paper = validId(req.params.id) ? await TestPaper.findOne({ _id: req.params.id, teacher: req.teacher._id }) : null;
  if (!paper || !paper.file || !paper.file.filename) {
    req.flash('error', 'That file could not be found.');
    return res.redirect('/teacher/test-papers');
  }
  await sendStoredFile(res, paper.file.filename, {
    download: true,
    downloadName: paper.file.originalName,
    legacyPaths: [paper.file.path]
  });
}));

router.post('/test-papers/:id/delete', action('/teacher/test-papers', async (req, res) => {
  const paper = validId(req.params.id) ? await TestPaper.findOneAndDelete({ _id: req.params.id, teacher: req.teacher._id }) : null;
  if (!paper) {
    req.flash('error', 'That question paper could not be found.');
    return res.redirect('/teacher/test-papers');
  }
  if (paper.file) removeFile(paper.file.filename, paper.file.path);
  req.flash('success', 'Question paper deleted.');
  res.redirect('/teacher/test-papers');
}));

// ---------------------------------------------------------------------------
// Important dates announced by the office
// ---------------------------------------------------------------------------
router.get('/dates', withImportantDates('teachers'), (req, res) => {
  res.render('teacher/dates', { page: 'teacher-dates' });
});

module.exports = router;
