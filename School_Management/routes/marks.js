const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Mark = require('../models/Mark');
const Teacher = require('../models/Teacher');

// Middleware to check authentication
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect('/login');
}

// Marks overview
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const user = req.session.user;
    let classes = [];
    let subjects = [];
    let marks = [];
    
    if (user.role === 'teacher') {
      // Find teacher's assigned class and subject
      const teacher = await Teacher.findOne({ email: user.email }).populate('class subject');
      if (teacher) {
        classes = teacher.class ? [teacher.class] : [];
        subjects = teacher.subject ? [teacher.subject] : [];
        marks = await Mark.find({ subject: teacher.subject })
          .populate('student')
          .populate('subject')
          .sort({ examDate: -1 })
          .limit(50);
      }
    } else {
      classes = await Class.find();
      subjects = await Subject.find();
      marks = await Mark.find()
        .populate('student')
        .populate('subject')
        .sort({ examDate: -1 })
        .limit(50);
    }
    
    res.render('marks/index', { user: req.session.user, classes, subjects, marks, page: 'marks' });
  } catch (error) {
    console.error('Error loading marks:', error);
    res.status(500).send('Error loading marks');
  }
});

// Add marks form
router.get('/add', isAuthenticated, async (req, res) => {
  try {
    const user = req.session.user;
    let classes = [];
    let subjects = [];
    
    if (user.role === 'teacher') {
      const teacher = await Teacher.findOne({ email: user.email }).populate('class subject');
      if (teacher) {
        classes = teacher.class ? [teacher.class] : [];
        subjects = teacher.subject ? [teacher.subject] : [];
      }
    } else {
      classes = await Class.find();
      subjects = await Subject.find();
    }
    
    const classId = req.query.classId;
    let students = [];
    
    if (classId) {
      students = await Student.find({ class: classId, status: 'Active' }).sort({ rollNumber: 1 });
    }
    
    res.render('marks/add', { user: req.session.user, classes, subjects, students, selectedClassId: classId, page: 'marks' });
  } catch (error) {
    console.error('Error loading add marks form:', error);
    res.status(500).send('Error loading form');
  }
});

// Submit marks
router.post('/add', isAuthenticated, async (req, res) => {
  try {
    const { studentId, subjectId, examType, maxMarks, obtainedMarks, examDate, remarks } = req.body;
    
    const markData = {
      student: studentId,
      subject: subjectId,
      examType: examType,
      maxMarks: parseInt(maxMarks),
      obtainedMarks: parseInt(obtainedMarks),
      examDate: examDate,
      remarks: remarks,
      enteredBy: req.session.user.id
    };
    
    await Mark.create(markData);
    
    req.flash('success', 'Marks added successfully');
    res.redirect('/marks');
  } catch (error) {
    console.error('Error adding marks:', error);
    req.flash('error', 'Error adding marks');
    res.redirect('/marks/add');
  }
});

// View marks report
router.get('/report', isAuthenticated, async (req, res) => {
  try {
    const students = await Student.find().populate('class');
    const subjects = await Subject.find();
    const marks = await Mark.find()
      .populate('student')
      .populate('subject')
      .sort({ examDate: -1 });
    const classes = await Class.find();
    
    res.render('marks/report', { user: req.session.user, students, subjects, marks, classes });
  } catch (error) {
    console.error('Error loading marks report:', error);
    res.status(500).send('Error loading report');
  }
});

// Export marks report to Excel
router.get('/export', isAuthenticated, async (req, res) => {
  try {
    const marks = await Mark.find()
      .populate('student')
      .populate('subject')
      .sort({ 'student.rollNumber': 1, examDate: -1 });

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Marks Report');

    // Add headers
    worksheet.columns = [
      { header: 'Roll Number', key: 'rollNumber', width: 15 },
      { header: 'Student Name', key: 'studentName', width: 25 },
      { header: 'Subject', key: 'subject', width: 20 },
      { header: 'Exam Type', key: 'examType', width: 15 },
      { header: 'Maximum Marks', key: 'maxMarks', width: 15 },
      { header: 'Obtained Marks', key: 'obtainedMarks', width: 15 },
      { header: 'Percentage', key: 'percentage', width: 12 },
      { header: 'Grade', key: 'grade', width: 10 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Remarks', key: 'remarks', width: 30 }
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data rows
    marks.forEach(mark => {
      worksheet.addRow({
        rollNumber: mark.student ? mark.student.rollNumber : '-',
        studentName: mark.student ? `${mark.student.firstName} ${mark.student.lastName}` : 'Unknown',
        subject: mark.subject ? mark.subject.name : 'N/A',
        examType: mark.examType,
        maxMarks: mark.maxMarks,
        obtainedMarks: mark.obtainedMarks,
        percentage: `${mark.percentage}%`,
        grade: mark.grade || 'N/A',
        date: mark.date ? new Date(mark.date).toLocaleDateString('en-IN', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        }) : (mark.examDate || 'N/A'),
        remarks: mark.remarks || ''
      });
    });

    // Set response headers for download
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=All_Marks_Report_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting marks:', error);
    res.status(500).send('Error exporting marks report');
  }
});

module.exports = router;
