const express = require('express');
const router = express.Router();
const { upload, uploadNote, uploadQuestionPaper } = require('../config/multer');
const ExcelJS = require('exceljs');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const Mark = require('../models/Mark');
const Remark = require('../models/Remark');
const Note = require('../models/Note');
const TestPaper = require('../models/TestPaper');
const User = require('../models/User');
const Holiday = require('../models/Holiday');
const fs = require('fs');
const path = require('path');

// Helper function to check if a date is Sunday
const isSunday = (date) => {
  return new Date(date).getDay() === 0;
};

// Helper function to check if a date is a holiday
const isHoliday = async (date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const holiday = await Holiday.findOne({
    date: { $gte: startOfDay, $lte: endOfDay }
  });

  return holiday;
};

// Middleware to check if user is a teacher
function isTeacher(req, res, next) {
  if (req.session.user && req.session.user.role === 'teacher') {
    return next();
  }
  res.redirect('/login');
}

// Teacher Dashboard
router.get('/dashboard', isTeacher, async (req, res) => {
  try {
    // Find teacher by user ID from session
    const teacher = await Teacher.findOne({ user: req.session.user.id })
      .populate('class subject');
    
    if (!teacher) {
      return res.redirect('/login');
    }

    const stats = {
      myClass: teacher.class ? teacher.class.name : 'Not Assigned',
      mySubject: teacher.subject ? teacher.subject.name : 'Not Assigned',
      totalStudents: teacher.class ? await Student.countDocuments({ class: teacher.class._id }) : 0,
      myNotes: await Note.countDocuments({ teacher: teacher._id }),
      myTestPapers: await TestPaper.countDocuments({ teacher: teacher._id })
    };

    res.render('teacher/dashboard', { 
      user: req.session.user, 
      teacher,
      stats,
      page: 'teacher-dashboard'
    });
  } catch (error) {
    console.error('Teacher dashboard error:', error);
    res.status(500).send('Error loading dashboard');
  }
});

// Attendance Management for Teachers
router.get('/attendance', isTeacher, async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ user: req.session.user.id })
      .populate('class');
    
    // Get date from query parameter or use today
    const selectedDate = req.query.date ? new Date(req.query.date) : new Date();
    selectedDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000);
    
    if (!teacher || !teacher.class) {
      return res.render('teacher/attendance', { 
        user: req.session.user, 
        teacher,
        students: [],
        attendanceRecords: {},
        todayDate: selectedDate.toISOString().split('T')[0],
        page: 'teacher-attendance',
        success: req.flash('success'),
        error: req.flash('error')
      });
    }

    // Filter students by section if teacher has a section assigned
    let studentQuery = { class: teacher.class._id, status: 'Active' };
    if (teacher.section) {
      studentQuery.section = teacher.section;
    }

    const students = await Student.find(studentQuery).sort({ rollNumber: 1 });
    
    const attendanceRecords = await Attendance.find({
      date: {
        $gte: selectedDate,
        $lt: nextDay
      }
    });

    // Create a map of student ID to attendance record for quick lookup
    const attendanceMap = {};
    attendanceRecords.forEach(record => {
      attendanceMap[record.student.toString()] = record;
    });

    res.render('teacher/attendance', { 
      user: req.session.user, 
      teacher,
      students,
      attendanceRecords: attendanceMap,
      todayDate: selectedDate.toISOString().split('T')[0],
      page: 'teacher-attendance',
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Teacher attendance error:', error);
    res.status(500).send('Error loading attendance');
  }
});

// Mark Attendance
router.post('/attendance/mark', isTeacher, async (req, res) => {
  try {
    const { attendanceData, selectedDate } = req.body;
    const teacher = await Teacher.findOne({ user: req.session.user.id });
    
    // Use selected date or today
    const attendanceDate = selectedDate ? new Date(selectedDate) : new Date();
    attendanceDate.setHours(0, 0, 0, 0);

    // Check if it's Sunday
    if (isSunday(attendanceDate)) {
      req.flash('error', 'Cannot mark attendance on Sunday (Weekly Off)');
      return res.redirect('/teacher/attendance' + (selectedDate ? `?date=${selectedDate}` : ''));
    }

    // Check if it's a holiday
    const holiday = await isHoliday(attendanceDate);
    if (holiday) {
      req.flash('error', `Cannot mark attendance on ${holiday.title}`);
      return res.redirect('/teacher/attendance' + (selectedDate ? `?date=${selectedDate}` : ''));
    }

    // Parse attendance data
    const records = JSON.parse(attendanceData);
    
    if (!records || records.length === 0) {
      req.flash('error', 'No attendance data to submit');
      return res.redirect('/teacher/attendance' + (selectedDate ? `?date=${selectedDate}` : ''));
    }

    let successCount = 0;
    let errorCount = 0;

    for (const record of records) {
      try {
        await Attendance.findOneAndUpdate(
          { student: record.studentId, date: attendanceDate },
          { status: record.status, remarks: record.remarks || '' },
          { upsert: true }
        );
        successCount++;
      } catch (err) {
        errorCount++;
        console.error('Error marking attendance for student:', record.studentId, err);
      }
    }

    if (errorCount === 0) {
      req.flash('success', `Attendance marked successfully for ${successCount} student(s)!`);
    } else {
      req.flash('error', `Attendance marked for ${successCount} student(s), but ${errorCount} failed.`);
    }

    res.redirect('/teacher/attendance' + (selectedDate ? `?date=${selectedDate}` : ''));
  } catch (error) {
    console.error('Attendance marking error:', error);
    req.flash('error', 'Error marking attendance');
    res.redirect('/teacher/attendance');
  }
});

// Remarks Management
router.get('/remarks', isTeacher, async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ user: req.session.user.id })
      .populate('class subject');
    
    const students = teacher.class ? 
      await Student.find({ class: teacher.class._id, status: 'Active' }).sort({ rollNumber: 1 }) : [];
    
    const remarks = await Remark.find({ teacher: teacher._id })
      .populate('student subject')
      .sort({ date: -1 });

    res.render('teacher/remarks', { 
      user: req.session.user, 
      teacher,
      students,
      remarks,
      page: 'teacher-remarks',
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Teacher remarks error:', error);
    res.status(500).send('Error loading remarks');
  }
});

// Add Remark
router.post('/remarks/add', isTeacher, async (req, res) => {
  try {
    const { student, remark, type } = req.body;
    const teacher = await Teacher.findOne({ user: req.session.user.id });
    
    if (!student || !remark || !type) {
      req.flash('error', 'Please fill in all required fields');
      return res.redirect('/teacher/remarks');
    }
    
    await Remark.create({
      student,
      teacher: teacher._id,
      subject: teacher.subject,
      remark,
      type
    });

    req.flash('success', `${type} remark added successfully!`);
    res.redirect('/teacher/remarks');
  } catch (error) {
    console.error('Add remark error:', error);
    req.flash('error', 'Error adding remark. Please try again.');
    res.redirect('/teacher/remarks');
  }
});

// Notes Management
router.get('/notes', isTeacher, async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ user: req.session.user.id })
      .populate('class subject');
    
    const notes = await Note.find({ teacher: teacher._id })
      .populate('subject class')
      .sort({ createdAt: -1 });

    res.render('teacher/notes', { 
      user: req.session.user, 
      teacher,
      notes,
      page: 'teacher-notes',
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Teacher notes error:', error);
    res.status(500).send('Error loading notes');
  }
});

// Add Note
router.post('/notes/add', isTeacher, (req, res) => {
  uploadNote.single('attachment')(req, res, async (err) => {
    try {
      if (err) {
        req.flash('error', err.message || 'Error uploading file');
        return res.redirect('/teacher/notes');
      }

      const { title, content, isPublic } = req.body;
      const teacher = await Teacher.findOne({ user: req.session.user.id });
      
      if (!title || !content) {
        // Delete uploaded file if validation fails
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        req.flash('error', 'Title and content are required');
        return res.redirect('/teacher/notes');
      }
      
      const noteData = {
        title,
        content,
        subject: teacher.subject,
        class: teacher.class,
        teacher: teacher._id,
        isPublic: isPublic === 'true'
      };

      // Add file information if uploaded
      if (req.file) {
        noteData.attachment = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: req.file.path,
          size: req.file.size,
          mimetype: req.file.mimetype,
          uploadDate: new Date()
        };
      }

      await Note.create(noteData);

      req.flash('success', 'Note created successfully!');
      res.redirect('/teacher/notes');
    } catch (error) {
      console.error('Add note error:', error);
      // Delete uploaded file if error occurs
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      req.flash('error', 'Error creating note. Please try again.');
      res.redirect('/teacher/notes');
    }
  });
});

// Download Note Attachment
router.get('/notes/:id/download', isTeacher, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    
    if (!note || !note.attachment || !note.attachment.path) {
      req.flash('error', 'File not found');
      return res.redirect('/teacher/notes');
    }

    // Check if file exists
    if (!fs.existsSync(note.attachment.path)) {
      req.flash('error', 'File no longer exists on server');
      return res.redirect('/teacher/notes');
    }

    // Set headers for download
    res.setHeader('Content-Type', note.attachment.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${note.attachment.originalName}"`);
    
    // Send file
    res.sendFile(path.resolve(note.attachment.path));
  } catch (error) {
    console.error('Download note error:', error);
    req.flash('error', 'Error downloading file');
    res.redirect('/teacher/notes');
  }
});

// Delete Note
router.post('/notes/:id/delete', isTeacher, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    
    if (!note) {
      req.flash('error', 'Note not found');
      return res.redirect('/teacher/notes');
    }

    // Delete file if exists
    if (note.attachment && note.attachment.path && fs.existsSync(note.attachment.path)) {
      fs.unlinkSync(note.attachment.path);
    }

    await Note.findByIdAndDelete(req.params.id);
    
    req.flash('success', 'Note deleted successfully');
    res.redirect('/teacher/notes');
  } catch (error) {
    console.error('Delete note error:', error);
    req.flash('error', 'Error deleting note');
    res.redirect('/teacher/notes');
  }
});

// Test Papers Management
router.get('/test-papers', isTeacher, async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ user: req.session.user.id })
      .populate('class subject');
    
    const testPapers = await TestPaper.find({ teacher: teacher._id })
      .populate('subject class')
      .sort({ date: -1 });

    res.render('teacher/test-papers', { 
      user: req.session.user, 
      teacher,
      testPapers,
      page: 'teacher-test-papers',
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Teacher test papers error:', error);
    res.status(500).send('Error loading test papers');
  }
});

// Add Test Paper
router.post('/test-papers/add', isTeacher, (req, res) => {
  uploadQuestionPaper.single('questionPaper')(req, res, async (err) => {
    try {
      if (err) {
        req.flash('error', err.message || 'Error uploading file');
        return res.redirect('/teacher/test-papers');
      }

      const { title, section, examType, date, maxMarks, description } = req.body;
      const teacher = await Teacher.findOne({ user: req.session.user.id });
      
      if (!title || !date || !maxMarks) {
        // Delete uploaded file if validation fails
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        req.flash('error', 'Title, date, and max marks are required');
        return res.redirect('/teacher/test-papers');
      }
      
      const paperData = {
        title,
        subject: teacher.subject,
        class: teacher.class,
        section: section || teacher.section,
        teacher: teacher._id,
        examType: examType || 'Test',
        date,
        maxMarks,
        description
      };

      // Add file information if uploaded
      if (req.file) {
        paperData.file = {
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: req.file.path,
          size: req.file.size,
          mimetype: req.file.mimetype,
          uploadDate: new Date()
        };
      }

      await TestPaper.create(paperData);

      req.flash('success', 'Question paper uploaded successfully!');
      res.redirect('/teacher/test-papers');
    } catch (error) {
      console.error('Add test paper error:', error);
      // Delete uploaded file if error occurs
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      req.flash('error', 'Error creating test paper. Please try again.');
      res.redirect('/teacher/test-papers');
    }
  });
});

// Download Question Paper
router.get('/test-papers/:id/download', isTeacher, async (req, res) => {
  try {
    const paper = await TestPaper.findById(req.params.id);
    
    if (!paper || !paper.file || !paper.file.path) {
      req.flash('error', 'File not found');
      return res.redirect('/teacher/test-papers');
    }

    // Check if file exists
    if (!fs.existsSync(paper.file.path)) {
      req.flash('error', 'File no longer exists on server');
      return res.redirect('/teacher/test-papers');
    }

    // Increment download count
    paper.downloads = (paper.downloads || 0) + 1;
    await paper.save();

    // Set headers for download
    res.setHeader('Content-Type', paper.file.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${paper.file.originalName}"`);
    
    // Send file
    res.sendFile(path.resolve(paper.file.path));
  } catch (error) {
    console.error('Download question paper error:', error);
    req.flash('error', 'Error downloading file');
    res.redirect('/teacher/test-papers');
  }
});

// Delete Question Paper
router.post('/test-papers/:id/delete', isTeacher, async (req, res) => {
  try {
    const paper = await TestPaper.findById(req.params.id);
    
    if (!paper) {
      req.flash('error', 'Question paper not found');
      return res.redirect('/teacher/test-papers');
    }

    // Delete file if exists
    if (paper.file && paper.file.path && fs.existsSync(paper.file.path)) {
      fs.unlinkSync(paper.file.path);
    }

    await TestPaper.findByIdAndDelete(req.params.id);
    
    req.flash('success', 'Question paper deleted successfully');
    res.redirect('/teacher/test-papers');
  } catch (error) {
    console.error('Delete question paper error:', error);
    req.flash('error', 'Error deleting question paper');
    res.redirect('/teacher/test-papers');
  }
});

// Marks Management for Teachers
router.get('/marks', isTeacher, async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ user: req.session.user.id })
      .populate('class subject');
    
    const students = teacher.class ? 
      await Student.find({ class: teacher.class._id, status: 'Active' }).sort({ rollNumber: 1 }) : [];
    
    // Get all subjects if class teacher, otherwise just their subject
    const subjects = teacher.isClassTeacher ? 
      await Subject.find() : 
      (teacher.subject ? [teacher.subject] : []);
    
    // If class teacher, show all marks for their class students
    // If subject teacher, show only their subject marks
    let marks;
    if (teacher.isClassTeacher && teacher.class) {
      marks = await Mark.find({ student: { $in: students.map(s => s._id) } })
        .populate('student subject')
        .sort({ date: -1 });
    } else {
      marks = await Mark.find({ subject: teacher.subject })
        .populate('student subject')
        .sort({ date: -1 });
    }

    res.render('teacher/marks', { 
      user: req.session.user, 
      teacher,
      students,
      subjects,
      marks,
      page: 'teacher-marks',
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Teacher marks error:', error);
    res.status(500).send('Error loading marks');
  }
});

// Add Marks (Only Class Teachers)
router.post('/marks/add', isTeacher, upload.single('answerSheet'), async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ user: req.session.user.id });
    
    // Check if user is a class teacher
    if (!teacher.isClassTeacher) {
      req.flash('error', 'Only class teachers can add marks. Please contact your class teacher.');
      return res.redirect('/teacher/marks');
    }
    
    const { student, subject, examType, maxMarks, obtainedMarks, remarks } = req.body;
    
    if (!student || !subject || !examType || !maxMarks || !obtainedMarks) {
      req.flash('error', 'All fields except remarks and file are required');
      return res.redirect('/teacher/marks');
    }
    
    const percentage = (obtainedMarks / maxMarks) * 100;
    let grade = 'F';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B+';
    else if (percentage >= 60) grade = 'B';
    else if (percentage >= 50) grade = 'C';
    else if (percentage >= 40) grade = 'D';

    const markData = {
      student,
      subject,
      examType,
      maxMarks,
      obtainedMarks,
      percentage: percentage.toFixed(2),
      grade,
      date: new Date(),
      remarks
    };

    // Add file path if uploaded
    if (req.file) {
      markData.answerSheetFile = req.file.filename;
    }

    await Mark.create(markData);

    req.flash('success', `Marks added successfully! Grade: ${grade} (${percentage.toFixed(2)}%)`);
    res.redirect('/teacher/marks');
  } catch (error) {
    console.error('Add marks error:', error);
    req.flash('error', 'Error adding marks. Please try again.');
    res.redirect('/teacher/marks');
  }
});

// Edit Marks (Only Class Teachers)
router.post('/marks/edit', isTeacher, upload.single('answerSheet'), async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ user: req.session.user.id });
    
    // Check if user is a class teacher
    if (!teacher.isClassTeacher) {
      req.flash('error', 'Only class teachers can edit marks. Please contact your class teacher.');
      return res.redirect('/teacher/marks');
    }
    
    const { markId, student, subject, examType, maxMarks, obtainedMarks, remarks } = req.body;
    
    if (!markId || !student || !subject || !examType || !maxMarks || !obtainedMarks) {
      req.flash('error', 'All fields except remarks and file are required');
      return res.redirect('/teacher/marks');
    }

    const percentage = (obtainedMarks / maxMarks) * 100;
    let grade = 'F';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B+';
    else if (percentage >= 60) grade = 'B';
    else if (percentage >= 50) grade = 'C';
    else if (percentage >= 40) grade = 'D';

    const updateData = {
      subject,
      examType,
      maxMarks,
      obtainedMarks,
      percentage: percentage.toFixed(2),
      grade,
      remarks
    };

    // Add file path if uploaded
    if (req.file) {
      updateData.answerSheetFile = req.file.filename;
    }

    await Mark.findByIdAndUpdate(markId, updateData);

    req.flash('success', `Marks updated successfully! Grade: ${grade} (${percentage.toFixed(2)}%)`);
    res.redirect('/teacher/marks');
  } catch (error) {
    console.error('Edit marks error:', error);
    req.flash('error', 'Error updating marks. Please try again.');
    res.redirect('/teacher/marks');
  }
});

// Delete Marks (Only Class Teachers)
router.post('/marks/delete/:id', isTeacher, async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ user: req.session.user.id });
    
    // Check if user is a class teacher
    if (!teacher.isClassTeacher) {
      req.flash('error', 'Only class teachers can delete marks. Please contact your class teacher.');
      return res.redirect('/teacher/marks');
    }
    
    const mark = await Mark.findById(req.params.id);
    
    if (!mark) {
      req.flash('error', 'Mark entry not found');
      return res.redirect('/teacher/marks');
    }

    await Mark.findByIdAndDelete(req.params.id);
    req.flash('success', 'Mark entry deleted successfully!');
    res.redirect('/teacher/marks');
  } catch (error) {
    console.error('Delete marks error:', error);
    req.flash('error', 'Error deleting mark entry. Please try again.');
    res.redirect('/teacher/marks');
  }
});

module.exports = router;
