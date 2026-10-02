const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Attendance = require('../models/Attendance');
const Mark = require('../models/Mark');

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect('/login');
}

// Dashboard
router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const students = await Student.find().populate('class');
    const classes = await Class.find();
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
      todayAttendance: todayAttendance.length
    };

    res.render('dashboard', { 
      user: req.session.user, 
      stats, 
      students: students.slice(0, 5),
      page: 'dashboard'
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Error loading dashboard');
  }
});

module.exports = router;
