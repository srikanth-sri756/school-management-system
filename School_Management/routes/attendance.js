const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const Holiday = require('../models/Holiday');

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

// Middleware to check authentication
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect('/login');
}

// Attendance overview
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const classes = await Class.find();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayAttendance = await Attendance.find({
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    }).populate({
      path: 'student',
      populate: { path: 'class' }
    }).sort({ date: -1 });
    
    res.render('attendance/index', { 
      user: req.session.user, 
      classes, 
      todayAttendance, 
      selectedDate: today.toISOString().split('T')[0] 
    });
  } catch (error) {
    console.error('Error loading attendance:', error);
    res.status(500).send('Error loading attendance');
  }
});

// Mark attendance form
router.get('/mark', isAuthenticated, async (req, res) => {
  try {
    const classes = await Class.find();
    const classId = req.query.classId;
    let students = [];
    
    if (classId) {
      students = await Student.find({ class: classId, status: 'Active' }).sort({ rollNumber: 1 });
    }
    
    res.render('attendance/mark', { user: req.session.user, classes, students, selectedClassId: classId });
  } catch (error) {
    console.error('Error loading mark attendance:', error);
    res.status(500).send('Error loading form');
  }
});

// Submit attendance
router.post('/mark', isAuthenticated, async (req, res) => {
  try {
    const { date, classId, attendance } = req.body;
    const attendanceDate = new Date(date);
    
    // Check if it's Sunday
    if (isSunday(attendanceDate)) {
      req.flash('error', 'Cannot mark attendance on Sunday (Weekly Off)');
      return res.redirect('/attendance/mark?classId=' + classId);
    }

    // Check if it's a holiday
    const holiday = await isHoliday(attendanceDate);
    if (holiday) {
      req.flash('error', `Cannot mark attendance on ${holiday.title}`);
      return res.redirect('/attendance/mark?classId=' + classId);
    }
    
    // Get all students in the class
    const students = await Student.find({ class: classId, status: 'Active' });
    const presentIds = attendance ? (Array.isArray(attendance) ? attendance : [attendance]) : [];
    
    // Delete existing attendance for this date and class
    await Attendance.deleteMany({
      class: classId,
      date: {
        $gte: new Date(attendanceDate.setHours(0, 0, 0, 0)),
        $lt: new Date(attendanceDate.setHours(23, 59, 59, 999))
      }
    });
    
    // Create attendance records
    const attendanceRecords = students.map(student => ({
      student: student._id,
      class: classId,
      date: date,
      status: presentIds.includes(student._id.toString()) ? 'Present' : 'Absent',
      markedBy: req.session.user.id
    }));
    
    await Attendance.insertMany(attendanceRecords);
    
    req.flash('success', 'Attendance marked successfully');
    res.redirect('/attendance');
  } catch (error) {
    console.error('Error marking attendance:', error);
    req.flash('error', 'Error marking attendance');
    res.redirect('/attendance/mark');
  }
});

// View attendance report
router.get('/report', isAuthenticated, async (req, res) => {
  try {
    const students = await Student.find().populate('class');
    const classes = await Class.find();
    const allAttendance = await Attendance.find()
      .populate('student')
      .populate('class')
      .sort({ date: -1 })
      .limit(100);
    
    res.render('attendance/report', { user: req.session.user, students, classes, attendance: allAttendance });
  } catch (error) {
    console.error('Error loading attendance report:', error);
    res.status(500).send('Error loading report');
  }
});

// Export attendance report to Excel
router.get('/export', isAuthenticated, async (req, res) => {
  try {
    const allAttendance = await Attendance.find()
      .populate('student')
      .populate('class')
      .sort({ date: -1 });

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    // Add headers
    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Student Name', key: 'studentName', width: 25 },
      { header: 'Roll Number', key: 'rollNumber', width: 15 },
      { header: 'Class', key: 'class', width: 15 },
      { header: 'Status', key: 'status', width: 12 }
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
    allAttendance.forEach(record => {
      worksheet.addRow({
        date: new Date(record.date).toLocaleDateString('en-IN', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        }),
        studentName: record.student ? `${record.student.firstName} ${record.student.lastName}` : 'Unknown',
        rollNumber: record.student ? record.student.rollNumber : '-',
        class: record.class ? record.class.name : 'Unknown',
        status: record.status
      });
    });

    // Set response headers for download
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=Attendance_Report_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.xlsx`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting attendance:', error);
    res.status(500).send('Error exporting report');
  }
});

// Edit attendance form
router.get('/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id).populate({
      path: 'student',
      populate: { path: 'class' }
    });
    
    if (!attendance) {
      req.flash('error', 'Attendance record not found');
      return res.redirect('/attendance');
    }

    res.render('attendance/edit', { attendance, user: req.session.user, page: 'attendance' });
  } catch (error) {
    console.error('Error loading attendance:', error);
    req.flash('error', 'Error loading attendance record');
    res.redirect('/attendance');
  }
});

// Update attendance
router.post('/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const { date, status, notes } = req.body;
    
    await Attendance.findByIdAndUpdate(req.params.id, {
      date: new Date(date),
      status,
      notes
    });

    req.flash('success', 'Attendance updated successfully');
    res.redirect('/attendance');
  } catch (error) {
    console.error('Error updating attendance:', error);
    req.flash('error', 'Error updating attendance');
    res.redirect('/attendance');
  }
});

module.exports = router;

