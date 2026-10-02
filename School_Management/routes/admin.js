const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const User = require('../models/User');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const ClassModel = require('../models/Class');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const Mark = require('../models/Mark');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/imports';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  }
});

// Simple auth middleware to protect admin pages (reuse session user)
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect('/login');
}

// Admin import page
router.get('/import', isAuthenticated, async (req, res) => {
  try {
    const classes = await ClassModel.find().sort({ name: 1 });
    const subjects = await Subject.find().sort({ name: 1 });
    res.render('admin/import', { 
      user: req.session.user,
      page: 'import',
      message: null, 
      error: null,
      classes,
      subjects
    });
  } catch (error) {
    console.error('Error loading import page:', error);
    res.render('admin/import', { 
      user: req.session.user,
      page: 'import',
      message: null, 
      error: 'Failed to load import page',
      classes: [],
      subjects: []
    });
  }
});

// Handle file upload import
router.post('/import', isAuthenticated, upload.single('importFile'), async (req, res) => {
  const classes = await ClassModel.find().sort({ name: 1 });
  const subjects = await Subject.find().sort({ name: 1 });
  
  try {
    const { importType } = req.body;
    
    if (!req.file) {
      return res.render('admin/import', { 
        user: req.session.user, 
        message: null, 
        error: 'No file uploaded',
        classes,
        subjects
      });
    }

    // Read the uploaded file
    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    
    let data = [];
    
    if (fileExt === '.csv') {
      // Read CSV file
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } else if (fileExt === '.xlsx' || fileExt === '.xls') {
      // Read Excel file
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    }

    // Delete the uploaded file
    fs.unlinkSync(filePath);

    if (!data || data.length === 0) {
      return res.render('admin/import', { 
        user: req.session.user, 
        message: null, 
        error: 'No data found in file',
        classes,
        subjects
      });
    }

    let result = {};
    
    // Import based on type
    switch (importType) {
      case 'students':
        result = await importStudents(data);
        break;
      case 'teachers':
        result = await importTeachers(data);
        break;
      case 'classes':
        result = await importClasses(data);
        break;
      case 'subjects':
        result = await importSubjects(data);
        break;
      default:
        throw new Error('Invalid import type');
    }

    res.render('admin/import', { 
      user: req.session.user,
      page: 'import',
      message: `Successfully imported ${result.success} ${importType}. Failed: ${result.failed}`,
      error: result.errors.length > 0 ? `Errors: ${result.errors.join(', ')}` : null,
      classes,
      subjects
    });

  } catch (error) {
    console.error('Import error:', error);
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.render('admin/import', { 
      user: req.session.user,
      page: 'import',
      message: null, 
      error: 'Import failed: ' + error.message,
      classes,
      subjects
    });
  }
});

// Import helper functions
async function importStudents(data) {
  let success = 0;
  let failed = 0;
  const errors = [];

  // Get all classes for lookup
  const allClasses = await ClassModel.find({}).lean();
  const classLookup = {};
  allClasses.forEach(c => {
    classLookup[c.name] = c._id;
    classLookup[c._id.toString()] = c._id;
  });

  for (const row of data) {
    try {
      // Validate required fields
      if (!row.firstName && !row['First Name'] && !row.first) {
        errors.push(`Row missing firstName`);
        failed++;
        continue;
      }

      // Map class name to ObjectId
      const className = row.class || row.Class || row['Class Name'] || row.className;
      const classId = className ? classLookup[className] : null;

      const studentData = {
        studentId: row.studentId || row['Student ID'] || row.id,
        firstName: row.firstName || row['First Name'] || row.first,
        lastName: row.lastName || row['Last Name'] || row.last || '',
        email: row.email || row.Email,
        dateOfBirth: row.dateOfBirth || row['Date of Birth'] || row.dob,
        gender: row.gender || row.Gender,
        class: classId,
        section: row.section || row.Section,
        rollNumber: row.rollNumber || row['Roll Number'] || row.roll,
        parentName: row.parentName || row['Parent Name'] || row.parent,
        parentPhone: row.parentPhone || row['Parent Phone'] || row.phone,
        parentEmail: row.parentEmail || row['Parent Email'],
        address: row.address || row.Address,
        admissionDate: row.admissionDate || row['Admission Date'],
        status: row.status || row.Status || 'Active'
      };

      await Student.create(studentData);
      success++;
    } catch (error) {
      errors.push(`Row ${data.indexOf(row) + 1}: ${error.message}`);
      failed++;
    }
  }

  return { success, failed, errors: errors.slice(0, 5) }; // Return first 5 errors
}

async function importTeachers(data) {
  let success = 0;
  let failed = 0;
  const errors = [];

  // Get all subjects and classes for lookup
  const allSubjects = await Subject.find({}).lean();
  const subjectLookup = {};
  allSubjects.forEach(s => {
    subjectLookup[s.name] = s._id;
    subjectLookup[s.code] = s._id;
  });

  const allClasses = await ClassModel.find({}).lean();
  const classLookup = {};
  allClasses.forEach(c => {
    classLookup[c.name] = c._id;
  });

  for (const row of data) {
    try {
      // Validate required fields
      if (!row.name && !row.Name) {
        errors.push(`Row missing name`);
        failed++;
        continue;
      }
      if (!row.email && !row.Email) {
        errors.push(`Row missing email`);
        failed++;
        continue;
      }

      const subjectName = row.subject || row.Subject;
      const subjectId = subjectName ? subjectLookup[subjectName] : null;

      const className = row.class || row.Class;
      const classId = className ? classLookup[className] : null;

      const teacherData = {
        name: row.name || row.Name,
        email: row.email || row.Email,
        phone: row.phone || row.Phone,
        subject: subjectId,
        class: classId,
        section: row.section || row.Section,
        isClassTeacher: row.isClassTeacher === 'Yes' || row.isClassTeacher === true || row['Class Teacher'] === 'Yes',
        salary: row.salary || row.Salary,
        address: row.address || row.Address
      };

      // Create user account for teacher
      const hashedPassword = await bcrypt.hash('teacher123', 10);
      const user = await User.create({
        name: teacherData.name,
        email: teacherData.email,
        password: hashedPassword,
        role: 'teacher'
      });

      teacherData.user = user._id;
      await Teacher.create(teacherData);
      success++;
    } catch (error) {
      errors.push(`Row ${data.indexOf(row) + 1}: ${error.message}`);
      failed++;
    }
  }

  return { success, failed, errors: errors.slice(0, 5) };
}

async function importClasses(data) {
  let success = 0;
  let failed = 0;
  const errors = [];

  for (const row of data) {
    try {
      if (!row.name && !row.Name) {
        errors.push(`Row missing name`);
        failed++;
        continue;
      }

      const classData = {
        name: row.name || row.Name,
        section: row.section || row.Section,
        capacity: row.capacity || row.Capacity || 0
      };

      await ClassModel.create(classData);
      success++;
    } catch (error) {
      errors.push(`Row ${data.indexOf(row) + 1}: ${error.message}`);
      failed++;
    }
  }

  return { success, failed, errors: errors.slice(0, 5) };
}

async function importSubjects(data) {
  let success = 0;
  let failed = 0;
  const errors = [];

  for (const row of data) {
    try {
      if (!row.name && !row.Name) {
        errors.push(`Row missing name`);
        failed++;
        continue;
      }

      const subjectData = {
        name: row.name || row.Name,
        code: row.code || row.Code
      };

      await Subject.create(subjectData);
      success++;
    } catch (error) {
      errors.push(`Row ${data.indexOf(row) + 1}: ${error.message}`);
      failed++;
    }
  }

  return { success, failed, errors: errors.slice(0, 5) };
}

// Download sample template route
router.get('/sample-template/:type', isAuthenticated, (req, res) => {
  const { type } = req.params;
  const { Parser } = require('json2csv');
  
  let data = [];
  let fields = [];
  
  switch (type) {
    case 'students':
      fields = ['studentId', 'firstName', 'lastName', 'email', 'dateOfBirth', 'gender', 'class', 'section', 'rollNumber', 'parentName', 'parentPhone', 'parentEmail', 'address', 'admissionDate', 'status'];
      data = [{
        studentId: 'ST001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        dateOfBirth: '2010-05-15',
        gender: 'Male',
        class: 'Class 10',
        section: 'A',
        rollNumber: '1',
        parentName: 'Mr. Doe',
        parentPhone: '9876543210',
        parentEmail: 'doe@example.com',
        address: '123 Main St',
        admissionDate: '2020-04-01',
        status: 'Active'
      }];
      break;
    
    case 'teachers':
      fields = ['name', 'email', 'phone', 'subject', 'class', 'section', 'isClassTeacher', 'salary', 'address'];
      data = [{
        name: 'Mr. Sharma',
        email: 'sharma@school.com',
        phone: '9876543210',
        subject: 'Mathematics',
        class: 'Class 10',
        section: 'A',
        isClassTeacher: 'Yes',
        salary: '50000',
        address: '123 Main St'
      }];
      break;
    
    case 'classes':
      fields = ['name', 'section', 'capacity'];
      data = [
        { name: 'Class 10', section: 'A', capacity: '40' },
        { name: 'Class 10', section: 'B', capacity: '35' }
      ];
      break;
    
    case 'subjects':
      fields = ['name', 'code'];
      data = [
        { name: 'Mathematics', code: 'MATH' },
        { name: 'English', code: 'ENG' },
        { name: 'Science', code: 'SCI' }
      ];
      break;
    
    default:
      return res.status(404).send('Invalid template type');
  }
  
  try {
    const parser = new Parser({ fields });
    const csv = parser.parse(data);
    
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.header('Content-Disposition', `attachment; filename="${type}-template.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).send('Error generating template');
  }
});

// Admin setup route: create default admin from env variables
router.get('/setup', async (req, res) => {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@school.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  try {
    let existing = await User.findOne({ email: adminEmail });
    if (existing) {
      return res.send(`Admin user already exists: ${existing.email}`);
    }

    const hashed = await bcrypt.hash(adminPassword, 10);
    const admin = new User({ name: 'Administrator', email: adminEmail, password: hashed, role: 'admin' });
    await admin.save();
    res.send(`Admin user created: ${adminEmail}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to create admin user: ' + err.message);
  }
});

module.exports = router;
