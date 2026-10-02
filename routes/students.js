const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const Mark = require('../models/Mark');
const Subject = require('../models/Subject');
const ExcelJS = require('exceljs');
const Fee = require('../models/Fee');
const { isAdmin } = require('../middleware/auth');
const { uploadPersonFiles, removePrivateFile, removeUploadedFiles, fileInfo } = require('../config/multer');
const { STUDENT_DOCUMENTS, mergeDocuments, missingDocuments, listLabels } = require('../config/documents');

// Parses the multipart student form (photo + admission documents). Only
// administrators may add photos or documents; files sent by anyone else are discarded.
const studentUpload = [
  ...uploadPersonFiles(STUDENT_DOCUMENTS.map(doc => doc.key)),
  (req, res, next) => {
    if (!isAdmin(req)) {
      removeUploadedFiles(req);
      req.files = {};
    }
    next();
  }
];

const firstFile = (req, field) => req.files && req.files[field] && req.files[field][0];
const uploader = (req) => req.session.user.name || req.session.user.email;

// Student fields shared by the add and edit forms
function studentFields(body) {
  const isTransfer = body.isTransfer === 'yes';
  return {
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    dateOfBirth: body.dateOfBirth,
    gender: body.gender,
    rollNumber: body.rollNumber,
    parentName: body.parentName,
    parentPhone: body.parentPhone,
    parentEmail: body.parentEmail,
    address: body.address,
    admissionDate: body.admissionDate,
    isTransfer,
    previousSchool: isTransfer ? String(body.previousSchool || '').trim() : ''
  };
}

// The class record for the chosen class + section: { class, section }, or null if
// the choice isn't valid. The student's section always matches the class record.
async function classFields(body) {
  const cls = await Class.forGradeAndSection(body.grade, body.section);
  return cls ? { class: cls._id, section: cls.section } : null;
}

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
    const classes = await Class.ordered();
    res.render('students/list', { user: req.session.user, students, classes });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).send('Error fetching students');
  }
});

// Add student form
router.get('/add', isAuthenticated, async (req, res) => {
  try {
    const classes = await Class.ordered();
    res.render('students/add', { user: req.session.user, classes });
  } catch (error) {
    console.error('Error loading add student form:', error);
    res.status(500).send('Error loading form');
  }
});

// Add student handler (new admission). Uploaded files are deleted again unless the
// student is saved (see uploadPersonFiles).
router.post('/add', isAuthenticated, studentUpload, async (req, res) => {
  const studentData = studentFields(req.body);
  try {
    const problems = [];
    const placement = await classFields(req.body);
    if (placement) Object.assign(studentData, placement);
    else problems.push('Choose a class and section.');
    if (studentData.isTransfer && !studentData.previousSchool) problems.push('Enter the name of the previous school.');

    if (isAdmin(req)) {
      const photo = firstFile(req, 'photo');
      if (photo) studentData.photo = fileInfo(photo);
      studentData.documents = mergeDocuments('student', [], req.files, null, uploader(req)).documents;
      const missing = missingDocuments('student', studentData);
      if (missing.length) problems.push(`Upload the ${listLabels(missing)} to complete the admission.`);
    }

    if (problems.length) {
      // Show the form again with what was typed; files have to be chosen again
      const classes = await Class.ordered();
      return res.status(422).render('students/add', {
        user: req.session.user,
        classes,
        values: { ...studentData, class: { name: req.body.grade, section: req.body.section }, photo: null, documents: [] },
        formErrors: problems
      });
    }

    // Generate student ID
    const count = await Student.countDocuments();
    studentData.studentId = `STU${String(count + 1).padStart(4, '0')}`;

    await Student.create(studentData);
    req.uploadsSaved = true;
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

    const classes = await Class.ordered();
    const attendance = await Attendance.find({ student: req.params.id }).sort({ date: -1 }).limit(20);
    const marks = await Mark.find({ student: req.params.id }).populate('subject').sort({ examDate: -1 });
    const subjects = await Subject.find();
    // Fees and receipts are shown to administrators only
    const fees = isAdmin(req) ? await Fee.find({ student: student._id }).sort({ createdAt: -1 }) : [];

    res.render('students/view', { user: req.session.user, student, classes, attendance, marks, subjects, fees, page: 'students' });
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

    const classes = await Class.ordered();
    res.render('students/edit', { user: req.session.user, student, classes });
  } catch (error) {
    console.error('Error loading edit form:', error);
    res.redirect('/students');
  }
});

// Update student handler
router.post('/:id/edit', isAuthenticated, studentUpload, async (req, res) => {
  try {
    const existing = await Student.findById(req.params.id).select('photo documents');
    if (!existing) return res.redirect('/students');

    const placement = await classFields(req.body);
    if (!placement) {
      req.flash('error', 'Choose a class and section.');
      return res.redirect('/students/' + req.params.id + '/edit');
    }
    const studentData = { ...studentFields(req.body), ...placement, status: req.body.status };
    if (studentData.isTransfer && !studentData.previousSchool) {
      req.flash('error', 'Enter the name of the previous school.');
      return res.redirect('/students/' + req.params.id + '/edit');
    }

    // Photo and documents (administrators only; studentUpload already dropped anyone else's files)
    const obsolete = [];
    if (isAdmin(req)) {
      const oldPhoto = existing.photo && existing.photo.filename;
      const photo = firstFile(req, 'photo');
      if (photo) {
        studentData.photo = fileInfo(photo);
      } else if (req.body.removePhoto === 'yes' && oldPhoto) {
        studentData.$unset = { photo: 1 };
      }
      if (oldPhoto && (photo || studentData.$unset)) obsolete.push(['photo', oldPhoto]);

      const { documents, obsoleteFiles } = mergeDocuments('student', existing.documents, req.files, req.body.removeDoc, uploader(req));
      studentData.documents = documents;
      obsoleteFiles.forEach(filename => obsolete.push(['document', filename]));
    }

    await Student.findByIdAndUpdate(req.params.id, studentData);
    req.uploadsSaved = true;
    obsolete.forEach(([kind, filename]) => removePrivateFile(kind, filename));
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
    const student = await Student.findByIdAndDelete(req.params.id);
    if (student && student.photo) removePrivateFile('photo', student.photo.filename);
    if (student) (student.documents || []).forEach(doc => removePrivateFile('document', doc.filename));
    req.flash('success', 'Student deleted successfully');
    res.redirect('/students');
  } catch (error) {
    console.error('Error deleting student:', error);
    req.flash('error', 'Error deleting student');
    res.redirect('/students');
  }
});

module.exports = router;
