const express = require('express');
const router = express.Router();
const TeacherAttendance = require('../models/TeacherAttendance');
const Teacher = require('../models/Teacher');
const Holiday = require('../models/Holiday');
const { Parser } = require('json2csv');

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

// Teacher attendance overview
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayAttendance = await TeacherAttendance.find({
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    }).populate({
      path: 'teacher',
      populate: [
        { path: 'subject' },
        { path: 'class' }
      ]
    }).sort({ date: -1 });
    
    res.render('teacher-attendance/index', { 
      user: req.session.user,
      page: 'teacher-attendance',
      todayAttendance, 
      selectedDate: today.toISOString().split('T')[0] 
    });
  } catch (error) {
    console.error('Error loading teacher attendance:', error);
    res.status(500).send('Error loading teacher attendance');
  }
});

// Mark teacher attendance form
router.get('/mark', isAuthenticated, async (req, res) => {
  try {
    const teachers = await Teacher.find().populate('class subject').sort({ name: 1 });
    const today = new Date().toISOString().split('T')[0];
    
    res.render('teacher-attendance/mark', { 
      user: req.session.user,
      page: 'teacher-attendance',
      teachers,
      selectedDate: today
    });
  } catch (error) {
    console.error('Error loading mark attendance page:', error);
    res.status(500).send('Error loading page');
  }
});

// Submit teacher attendance
router.post('/mark', isAuthenticated, async (req, res) => {
  try {
    const { date, attendanceData } = req.body;
    const attendanceDate = new Date(date);
    
    // Check if it's Sunday
    if (isSunday(attendanceDate)) {
      req.flash('error', 'Cannot mark attendance on Sunday (Weekly Off)');
      return res.redirect('/teacher-attendance/mark');
    }

    // Check if it's a holiday
    const holiday = await isHoliday(attendanceDate);
    if (holiday) {
      req.flash('error', `Cannot mark attendance on ${holiday.title}`);
      return res.redirect('/teacher-attendance/mark');
    }
    
    if (!attendanceData || Object.keys(attendanceData).length === 0) {
      req.flash('error', 'No attendance data provided');
      return res.redirect('/teacher-attendance/mark');
    }

    const bulkOps = [];
    for (const [teacherId, data] of Object.entries(attendanceData)) {
      if (data.status) {
        bulkOps.push({
          updateOne: {
            filter: {
              teacher: teacherId,
              date: attendanceDate
            },
            update: {
              teacher: teacherId,
              date: new Date(date),
              status: data.status,
              checkIn: data.checkIn || null,
              checkOut: data.checkOut || null,
              notes: data.notes || '',
              markedBy: req.session.user._id
            },
            upsert: true
          }
        });
      }
    }

    if (bulkOps.length > 0) {
      await TeacherAttendance.bulkWrite(bulkOps);
      req.flash('success', `Teacher attendance marked for ${bulkOps.length} teacher(s)`);
    } else {
      req.flash('error', 'No valid attendance records to save');
    }

    res.redirect('/teacher-attendance');
  } catch (error) {
    console.error('Error marking teacher attendance:', error);
    req.flash('error', 'Error marking attendance');
    res.redirect('/teacher-attendance/mark');
  }
});

// Edit teacher attendance form
router.get('/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const attendance = await TeacherAttendance.findById(req.params.id).populate({
      path: 'teacher',
      populate: [
        { path: 'subject' },
        { path: 'class' }
      ]
    });
    
    if (!attendance) {
      req.flash('error', 'Attendance record not found');
      return res.redirect('/teacher-attendance');
    }

    res.render('teacher-attendance/edit', { 
      user: req.session.user,
      page: 'teacher-attendance',
      attendance 
    });
  } catch (error) {
    console.error('Error loading attendance:', error);
    req.flash('error', 'Error loading attendance record');
    res.redirect('/teacher-attendance');
  }
});

// Update teacher attendance
router.post('/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const { date, status, checkIn, checkOut, notes } = req.body;
    
    await TeacherAttendance.findByIdAndUpdate(req.params.id, {
      date: new Date(date),
      status,
      checkIn,
      checkOut,
      notes
    });

    req.flash('success', 'Teacher attendance updated successfully');
    res.redirect('/teacher-attendance');
  } catch (error) {
    console.error('Error updating attendance:', error);
    req.flash('error', 'Error updating attendance');
    res.redirect('/teacher-attendance');
  }
});

// View teacher attendance report
router.get('/report', isAuthenticated, async (req, res) => {
  try {
    const { teacherId, startDate, endDate } = req.query;
    const teachers = await Teacher.find().sort({ name: 1 });
    
    let query = {};
    if (teacherId) query.teacher = teacherId;
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const attendanceRecords = await TeacherAttendance.find(query)
      .populate({
        path: 'teacher',
        populate: [
          { path: 'subject' },
          { path: 'class' }
        ]
      })
      .sort({ date: -1 });
    
    res.render('teacher-attendance/report', {
      user: req.session.user,
      page: 'teacher-attendance',
      teachers,
      attendanceRecords,
      filters: { teacherId, startDate, endDate }
    });
  } catch (error) {
    console.error('Error loading report:', error);
    res.status(500).send('Error loading report');
  }
});

// Export teacher attendance report as CSV
router.get('/export', isAuthenticated, async (req, res) => {
  try {
    const { teacherId, startDate, endDate } = req.query;
    let query = {};
    if (teacherId) query.teacher = teacherId;
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    const attendanceRecords = await TeacherAttendance.find(query)
      .populate({
        path: 'teacher',
        populate: [
          { path: 'subject' },
          { path: 'class' }
        ]
      })
      .sort({ date: -1 });

    // Prepare CSV data
    const csvData = attendanceRecords.map(record => ({
      Date: record.date ? new Date(record.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
      Teacher: record.teacher ? record.teacher.name : 'N/A',
      Subject: record.teacher && record.teacher.subject ? record.teacher.subject.name : 'N/A',
      Class: record.teacher && record.teacher.class ? record.teacher.class.name : 'N/A',
      Section: record.teacher && record.teacher.section ? record.teacher.section : 'N/A',
      Status: record.status || 'N/A',
      'Check-In': record.checkIn || '-',
      'Check-Out': record.checkOut || '-',
      Notes: record.notes || '-'
    }));

    // Handle empty records
    if (csvData.length === 0) {
      return res.status(404).send('No attendance records found for the selected filters.');
    }

    const fields = ['Date', 'Teacher', 'Subject', 'Class', 'Section', 'Status', 'Check-In', 'Check-Out', 'Notes'];
    const parser = new Parser({ fields });
    const csv = parser.parse(csvData);
    
    // Generate filename with current date
    const filename = `teacher-attendance-report-${new Date().toISOString().split('T')[0]}.csv`;
    
    res.header('Content-Type', 'text/csv; charset=utf-8');
    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).send('Error exporting CSV');
  }
});

module.exports = router;
