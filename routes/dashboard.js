const express = require('express');
const { withImportantDates } = require('../middleware/important-dates');
const router = express.Router();
const Student = require('../models/Student');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const Mark = require('../models/Mark');
const Teacher = require('../models/Teacher');
const Fee = require('../models/Fee');

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect('/login');
}

// Dashboard
router.get('/dashboard', isAuthenticated, withImportantDates(null, 5), async (req, res) => {
  try {
    const students = await Student.find().populate('class');
    const classes = await Class.ordered();
    const subjects = await Subject.find();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayAttendance = await Attendance.find({
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    const stats = {
      totalStudents: students.length,
      activeStudents: students.filter(s => s.status === 'Active').length,
      totalClasses: classes.length,
      totalSubjects: subjects.length,
      totalAttendance: await Attendance.countDocuments(),
      totalMarks: await Mark.countDocuments(),
      todayAttendance: todayAttendance.length,
      todayPresent: todayAttendance.filter(a => a.status === 'Present').length,
      totalTeachers: await Teacher.countDocuments(),
      pendingFees: await Fee.countDocuments({ status: { $ne: 'Paid' } })
    };

    // Most recently added students first
    const recentStudents = [...students].sort((a, b) => b._id.getTimestamp() - a._id.getTimestamp()).slice(0, 5);

    res.render('dashboard', {
      user: req.session.user,
      stats,
      students: recentStudents,
      page: 'dashboard'
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Error loading dashboard');
  }
});

module.exports = router;
