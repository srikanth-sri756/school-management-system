const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const Mark = require('../models/Mark');
const Subject = require('../models/Subject');
const ExcelJS = require('exceljs');

// Middleware to check authentication
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect('/login');
}

// List all students
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const students = await Student.find().populate('class').sort({ createdAt: -1 });
    const classes = await Class.find();
    res.render('students/list', { user: req.session.user, students, classes });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).send('Error fetching students');
  }
});

// Add student form
router.get('/add', isAuthenticated, async (req, res) => {
  try {
    const classes = await Class.find();
    res.render('students/add', { user: req.session.user, classes });
  } catch (error) {
    console.error('Error loading add student form:', error);
    res.status(500).send('Error loading form');
  }
});

// Add student handler
router.post('/add', isAuthenticated, async (req, res) => {
  try {
    // Generate student ID
    const count = await Student.countDocuments();
    const studentId = `STU${String(count + 1).padStart(4, '0')}`;
    
    const studentData = {
      studentId,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      dateOfBirth: req.body.dateOfBirth,
      gender: req.body.gender,
      class: req.body.classId,
      section: req.body.section,
      rollNumber: req.body.rollNumber,
      parentName: req.body.parentName,
      parentPhone: req.body.parentPhone,
      parentEmail: req.body.parentEmail,
      address: req.body.address,
      admissionDate: req.body.admissionDate
    };
    
    await Student.create(studentData);
    req.flash('success', 'Student added successfully');
    res.redirect('/students');
  } catch (error) {
    console.error('Error adding student:', error);
    req.flash('error', 'Error adding student');
    res.redirect('/students/add');
  }
});

// Export students to Excel
router.get('/export', isAuthenticated, async (req, res) => {
  try {
    const students = await Student.find()
      .populate('class')
      .sort({ rollNumber: 1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Students Data');

    // Define columns
    worksheet.columns = [
      { header: 'Student ID', key: 'studentId', width: 15 },
      { header: 'Roll Number', key: 'rollNumber', width: 15 },
      { header: 'First Name', key: 'firstName', width: 20 },
      { header: 'Last Name', key: 'lastName', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Gender', key: 'gender', width: 12 },
      { header: 'Date of Birth', key: 'dateOfBirth', width: 15 },
      { header: 'Class', key: 'class', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Admission Date', key: 'admissionDate', width: 15 },
      { header: 'Parent Name', key: 'parentName', width: 25 },
      { header: 'Parent Phone', key: 'parentPhone', width: 15 },
      { header: 'Parent Email', key: 'parentEmail', width: 30 },
      { header: 'Address', key: 'address', width: 40 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Add data rows
    students.forEach(student => {
      worksheet.addRow({
        studentId: student.studentId || 'N/A',
        rollNumber: student.rollNumber || 'N/A',
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email || 'N/A',
        phone: student.phone || 'N/A',
        gender: student.gender || 'N/A',
        dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-IN') : 'N/A',
        class: student.class ? student.class.name : 'N/A',
        status: student.status || 'Active',
        admissionDate: student.admissionDate ? new Date(student.admissionDate).toLocaleDateString('en-IN') : 'N/A',
        parentName: student.parentName || 'N/A',
        parentPhone: student.parentPhone || 'N/A',
        parentEmail: student.parentEmail || 'N/A',
        address: student.address || 'N/A'
      });
    });

    // Apply borders and alignment to all cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        if (rowNumber > 1) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });
    });

    // Generate filename with current date
    const date = new Date().toLocaleDateString('en-IN').replace(/\//g, '-');
    const filename = `Students_Data_${date}.xlsx`;

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting students:', error);
    res.status(500).send('Error exporting students data');
  }
});

// View student details
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate('class');
    if (!student) {
      return res.redirect('/students');
    }
    
    const classes = await Class.find();
    const attendance = await Attendance.find({ student: req.params.id }).sort({ date: -1 }).limit(20);
    const marks = await Mark.find({ student: req.params.id }).populate('subject').sort({ examDate: -1 });
    const subjects = await Subject.find();
    
    res.render('students/view', { user: req.session.user, student, classes, attendance, marks, subjects });
  } catch (error) {
    console.error('Error fetching student details:', error);
    res.redirect('/students');
  }
});

// Edit student form
router.get('/:id/edit', isAuthenticated, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate('class');
    if (!student) {
      return res.redirect('/students');
    }
    
    const classes = await Class.find();
    res.render('students/edit', { user: req.session.user, student, classes });
  } catch (error) {
    console.error('Error loading edit form:', error);
    res.redirect('/students');
  }
});

// Update student handler
router.post('/:id/edit', isAuthenticated, async (req, res) => {
  try {
    const studentData = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      dateOfBirth: req.body.dateOfBirth,
      gender: req.body.gender,
      class: req.body.classId,
      section: req.body.section,
      rollNumber: req.body.rollNumber,
      parentName: req.body.parentName,
      parentPhone: req.body.parentPhone,
      parentEmail: req.body.parentEmail,
      address: req.body.address,
      admissionDate: req.body.admissionDate,
      status: req.body.status
    };
    
    await Student.findByIdAndUpdate(req.params.id, studentData);
    req.flash('success', 'Student updated successfully');
    res.redirect('/students/' + req.params.id);
  } catch (error) {
    console.error('Error updating student:', error);
    req.flash('error', 'Error updating student');
    res.redirect('/students/' + req.params.id + '/edit');
  }
});

// Delete student
router.post('/:id/delete', isAuthenticated, async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    req.flash('success', 'Student deleted successfully');
    res.redirect('/students');
  } catch (error) {
    console.error('Error deleting student:', error);
    req.flash('error', 'Error deleting student');
    res.redirect('/students');
  }
});

module.exports = router;
