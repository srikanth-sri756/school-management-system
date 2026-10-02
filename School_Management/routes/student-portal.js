const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Mark = require('../models/Mark');
const Subject = require('../models/Subject');
const Class = require('../models/Class');

// Middleware to check if student is authenticated
function isStudentAuthenticated(req, res, next) {
  if (req.session.student) {
    return next();
  }
  res.redirect('/student/login');
}

// Student Login Page
router.get('/login', (req, res) => {
  if (req.session.student) {
    return res.redirect('/student/dashboard');
  }
  res.render('student-portal/login', { 
    error: req.flash('error'),
    success: req.flash('success')
  });
});

// Student Login Handler
router.post('/login', async (req, res) => {
  try {
    const { studentId, password } = req.body;
    
    const student = await Student.findOne({ studentId }).populate('class');
    
    if (!student) {
      // For API/mobile app requests
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(401).json({ success: false, message: 'Invalid Student ID or Password' });
      }
      req.flash('error', 'Invalid Student ID or Password');
      return res.redirect('/student/login');
    }

    // Check if student has a password set
    if (!student.password) {
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(401).json({ success: false, message: 'Password not set. Please contact administration.' });
      }
      req.flash('error', 'Password not set. Please contact administration.');
      return res.redirect('/student/login');
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, student.password);
    
    if (!isMatch) {
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(401).json({ success: false, message: 'Invalid Student ID or Password' });
      }
      req.flash('error', 'Invalid Student ID or Password');
      return res.redirect('/student/login');
    }

    // Check if student is active
    if (student.status !== 'Active') {
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(401).json({ success: false, message: 'Your account is inactive. Please contact administration.' });
      }
      req.flash('error', 'Your account is inactive. Please contact administration.');
      return res.redirect('/student/login');
    }

    // Set session
    req.session.student = {
      id: student._id,
      studentId: student.studentId,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      class: student.class,
      section: student.section,
      rollNumber: student.rollNumber
    };

    // For API/mobile app requests
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({ 
        success: true, 
        message: 'Login successful',
        student: {
          _id: student._id,
          studentId: student.studentId,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          class: student.class,
          section: student.section,
          rollNumber: student.rollNumber,
          dateOfBirth: student.dateOfBirth,
          gender: student.gender,
          parentName: student.parentName,
          parentPhone: student.parentPhone,
          parentEmail: student.parentEmail,
          address: student.address,
          admissionDate: student.admissionDate,
          status: student.status
        }
      });
    }

    req.flash('success', 'Login successful!');
    res.redirect('/student/dashboard');
  } catch (error) {
    console.error('Student login error:', error);
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({ success: false, message: 'An error occurred. Please try again.' });
    }
    req.flash('error', 'An error occurred. Please try again.');
    res.redirect('/student/login');
  }
});

// Student Dashboard
router.get('/dashboard', isStudentAuthenticated, async (req, res) => {
  try {
    const student = await Student.findById(req.session.student.id)
      .populate('class');

    // Get attendance summary
    const totalClasses = await Attendance.countDocuments({
      student: student._id
    });
    
    const presentClasses = await Attendance.countDocuments({
      student: student._id,
      status: 'Present'
    });

    const attendancePercentage = totalClasses > 0 
      ? ((presentClasses / totalClasses) * 100).toFixed(2)
      : 0;

    // Get recent attendance
    const recentAttendance = await Attendance.find({
      student: student._id
    })
    .populate('class')
    .sort({ date: -1 })
    .limit(10);

    // Get subjects
    const subjects = await Subject.find();

    // Get recent marks
    const recentMarks = await Mark.find({
      student: student._id
    })
    .populate('subject')
    .sort({ createdAt: -1 })
    .sort({ createdAt: -1 })
    .limit(10);

    // For API/mobile app requests
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({
        success: true,
        student: student,
        attendancePercentage: parseFloat(attendancePercentage),
        attendanceStats: {
          total: totalClasses,
          present: presentClasses,
          absent: totalClasses - presentClasses,
          late: 0,
        },
        recentAttendance,
        recentMarks,
        subjects
      });
    }

    res.render('student-portal/dashboard', {
      student: req.session.student,
      studentDetails: student,
      attendancePercentage: attendancePercentage,
      attendanceStats: {
        total: totalClasses,
        present: presentClasses,
        percentage: attendancePercentage
      },
      recentAttendance,
      recentMarks,
      subjects,
      page: 'dashboard'
    });
  } catch (error) {
    console.error('Error loading student dashboard:', error);
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({ success: false, message: 'Error loading dashboard' });
    }
    res.status(500).send('Error loading dashboard');
  }
});

// View Attendance
router.get('/attendance', isStudentAuthenticated, async (req, res) => {
  try {
    const student = await Student.findById(req.session.student.id);
    
    // Get filters (only month and year - no subject since attendance is daily)
    const { month, year } = req.query;
    
    let filter = { student: student._id };
    
    // Attendance is daily (not per subject), so only filter by date
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      filter.date = {
        $gte: startDate.toISOString().split('T')[0],
        $lte: endDate.toISOString().split('T')[0]
      };
    }

    const attendance = await Attendance.find(filter)
      .populate('class')
      .sort({ date: -1 });

    // Calculate statistics
    const stats = {
      total: attendance.length,
      present: attendance.filter(a => a.status === 'Present').length,
      absent: attendance.filter(a => a.status === 'Absent').length,
      late: attendance.filter(a => a.status === 'Late').length
    };
    stats.percentage = stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(2) : 0;

    // For API/mobile app requests
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({
        success: true,
        student: student,
        attendance,
        stats,
        filters: { month, year }
      });
    }

    res.render('student-portal/attendance', {
      student: req.session.student,
      attendance,
      subjects: [], // Empty array since we removed subject filtering
      stats,
      filters: { subject: '', month, year },
      page: 'attendance'
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({ success: false, message: 'Error fetching attendance' });
    }
    res.status(500).send('Error fetching attendance');
  }
});

// View Marks/Grades
router.get('/marks', isStudentAuthenticated, async (req, res) => {
  try {
    const student = await Student.findById(req.session.student.id);
    
    const { subject, exam } = req.query;
    
    let filter = { student: student._id };
    
    if (subject) {
      filter.subject = subject;
    }
    
    if (exam) {
      filter.exam = exam;
    }

    const marks = await Mark.find(filter)
      .populate('subject')
      .sort({ createdAt: -1 });

    const subjects = await Subject.find();
    
    // Get unique exam types from marks
    const examTypes = [...new Set(marks.map(mark => mark.examType).filter(Boolean))];
    const exams = examTypes.map(type => ({ name: type }));

    // Calculate overall statistics
    let totalMarks = 0;
    let obtainedMarks = 0;
    
    marks.forEach(mark => {
      totalMarks += mark.maxMarks || 0;
      obtainedMarks += mark.obtainedMarks || 0;
    });

    const percentage = totalMarks > 0 ? ((obtainedMarks / totalMarks) * 100).toFixed(2) : 0;

    // For API/mobile app requests
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({
        success: true,
        student: await Student.findById(req.session.student.id).populate('class'),
        marks,
        subjects,
        exams,
        stats: {
          totalMarks,
          obtainedMarks,
          percentage: parseFloat(percentage)
        },
        filters: { subject, exam }
      });
    }

    res.render('student-portal/marks', {
      student: req.session.student,
      marks,
      subjects,
      exams, // Add the exams array
      stats: {
        total: totalMarks,
        obtained: obtainedMarks,
        percentage
      },
      filters: { subject, exam },
      page: 'marks'
    });
  } catch (error) {
    console.error('Error fetching marks:', error);
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({ success: false, message: 'Error fetching marks' });
    }
    res.status(500).send('Error fetching marks');
  }
});

// View Profile
router.get('/profile', isStudentAuthenticated, async (req, res) => {
  try {
    const student = await Student.findById(req.session.student.id)
      .populate('class');

    const Fee = require('../models/Fee');
    
    // Get all fees for this student
    const fees = await Fee.find({ student: student._id }).sort({ createdAt: -1 });
    
    // Calculate total fees
    const totalAmount = fees.reduce((sum, fee) => sum + fee.amount, 0);
    const totalPaid = fees.reduce((sum, fee) => sum + fee.paid, 0);
    const totalPending = totalAmount - totalPaid;
    
    // Collect all payments from all fee records
    const allPayments = [];
    fees.forEach(fee => {
      if (fee.payments && fee.payments.length > 0) {
        fee.payments.forEach(payment => {
          allPayments.push({
            ...payment.toObject(),
            feeTerm: fee.term,
            feeId: fee._id
          });
        });
      }
    });
    
    // Sort payments by date (most recent first)
    allPayments.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Fee structure breakdown (you can customize this based on your fee types)
    const feeStructure = {
      tuitionFee: fees.find(f => f.term.includes('Tuition'))?.amount || 0,
      transportFee: fees.find(f => f.term.includes('Transport'))?.amount || 0,
      libraryFee: fees.find(f => f.term.includes('Library'))?.amount || 0,
      labFee: fees.find(f => f.term.includes('Lab'))?.amount || 0,
      sportsFee: fees.find(f => f.term.includes('Sports'))?.amount || 0,
      otherFees: fees.filter(f => !['Tuition', 'Transport', 'Library', 'Lab', 'Sports'].some(t => f.term.includes(t)))
                     .reduce((sum, f) => sum + f.amount, 0),
      total: totalAmount,
      paid: totalPaid,
      pending: totalPending,
      payments: allPayments
    };

    // For API/mobile app requests
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({
        success: true,
        student,
        feeStructure
      });
    }

    res.render('student-portal/profile', {
      student: req.session.student,
      studentDetails: student,
      feeStructure,
      page: 'profile'
    });
  } catch (error) {
    console.error('Error loading profile:', error);
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({ success: false, message: 'Error loading profile' });
    }
    res.status(500).send('Error loading profile');
  }
});

// Fees Page
router.get('/fees', isStudentAuthenticated, async (req, res) => {
  try {
    const student = await Student.findById(req.session.student.id)
      .populate('class');

    const Fee = require('../models/Fee');
    
    // Get all fees for this student
    const fees = await Fee.find({ student: student._id }).sort({ createdAt: -1 });
    
    // Calculate total fees
    const totalAmount = fees.reduce((sum, fee) => sum + fee.amount, 0);
    const totalPaid = fees.reduce((sum, fee) => sum + fee.paid, 0);
    const totalPending = totalAmount - totalPaid;
    
    // Collect all payments from all fee records
    const allPayments = [];
    fees.forEach(fee => {
      if (fee.payments && fee.payments.length > 0) {
        fee.payments.forEach(payment => {
          allPayments.push({
            ...payment.toObject(),
            feeTerm: fee.term,
            feeId: fee._id
          });
        });
      }
    });
    
    // Sort payments by date (most recent first)
    allPayments.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Get installment notifications
    const notifications = [];
    const today = new Date();
    
    fees.forEach(fee => {
      if (fee.hasInstallmentPlan && fee.installments) {
        fee.installments.forEach(installment => {
          if (installment.status !== 'Paid') {
            const dueDate = new Date(installment.dueDate);
            const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            
            let notificationType = 'info';
            let message = '';
            
            if (daysUntilDue < 0) {
              notificationType = 'danger';
              message = `Installment ${installment.installmentNumber} for ${fee.term} is ${Math.abs(daysUntilDue)} days overdue!`;
              installment.status = 'Overdue';
            } else if (daysUntilDue === 0) {
              notificationType = 'warning';
              message = `Installment ${installment.installmentNumber} for ${fee.term} is due today!`;
            } else if (daysUntilDue <= 7) {
              notificationType = 'warning';
              message = `Installment ${installment.installmentNumber} for ${fee.term} is due in ${daysUntilDue} days`;
            } else if (daysUntilDue <= 30) {
              notificationType = 'info';
              message = `Installment ${installment.installmentNumber} for ${fee.term} is due in ${daysUntilDue} days`;
            }
            
            if (message) {
              notifications.push({
                type: notificationType,
                message,
                feeId: fee._id,
                feeTerm: fee.term,
                installmentId: installment._id,
                installmentNumber: installment.installmentNumber,
                amount: installment.amount,
                paidAmount: installment.paidAmount,
                dueDate: installment.dueDate,
                daysUntilDue
              });
            }
          }
        });
      }
    });
    
    // Sort by urgency (overdue first, then by days until due)
    notifications.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
    
    // Fee structure breakdown
    const feeStructure = {
      tuitionFee: fees.find(f => f.term.includes('Tuition'))?.amount || 0,
      transportFee: fees.find(f => f.term.includes('Transport'))?.amount || 0,
      libraryFee: fees.find(f => f.term.includes('Library'))?.amount || 0,
      labFee: fees.find(f => f.term.includes('Lab'))?.amount || 0,
      sportsFee: fees.find(f => f.term.includes('Sports'))?.amount || 0,
      otherFees: fees.filter(f => !['Tuition', 'Transport', 'Library', 'Lab', 'Sports'].some(t => f.term.includes(t)))
                     .reduce((sum, f) => sum + f.amount, 0),
      total: totalAmount,
      paid: totalPaid,
      pending: totalPending,
      payments: allPayments
    };

    res.render('student-portal/fees', {
      student: req.session.student,
      studentDetails: student,
      feeStructure,
      fees,
      installmentNotifications: notifications,
      page: 'fees'
    });
  } catch (error) {
    console.error('Error loading fees:', error);
    res.status(500).send('Error loading fees');
  }
});

// Update Profile
router.post('/profile/update', isStudentAuthenticated, async (req, res) => {
  try {
    const { email, parentPhone, parentEmail, address } = req.body;
    
    await Student.findByIdAndUpdate(req.session.student.id, {
      email,
      parentPhone,
      parentEmail,
      address
    });

    req.flash('success', 'Profile updated successfully');
    res.redirect('/student/profile');
  } catch (error) {
    console.error('Error updating profile:', error);
    req.flash('error', 'Error updating profile');
    res.redirect('/student/profile');
  }
});

// Change Password
router.post('/change-password', isStudentAuthenticated, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    
    if (newPassword !== confirmPassword) {
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(400).json({ success: false, message: 'New passwords do not match' });
      }
      req.flash('error', 'New passwords do not match');
      return res.redirect('/student/profile');
    }

    const student = await Student.findById(req.session.student.id);
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, student.password);
    
    if (!isMatch) {
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
      }
      req.flash('error', 'Current password is incorrect');
      return res.redirect('/student/profile');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await Student.findByIdAndUpdate(req.session.student.id, {
      password: hashedPassword
    });

    // For API/mobile app requests
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({ success: true, message: 'Password changed successfully' });
    }

    req.flash('success', 'Password changed successfully');
    res.redirect('/student/profile');
  } catch (error) {
    console.error('Error changing password:', error);
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({ success: false, message: 'Error changing password' });
    }
    req.flash('error', 'Error changing password');
    res.redirect('/student/profile');
  }
});

// Get Class Teachers and Subject Teachers
router.get('/teachers', isStudentAuthenticated, async (req, res) => {
  try {
    const student = await Student.findById(req.session.student.id).populate('class');
    const Teacher = require('../models/Teacher');
    
    // Get class teacher - find teacher assigned to this class
    const classTeacher = await Teacher.findOne({ 
      class: student.class._id,
      isClassTeacher: true 
    }).populate('subject');
    
    // Get all subject teachers for this class
    const subjectTeachers = await Teacher.find({ 
      class: student.class._id 
    }).populate('subject');
    
    const teachersData = {
      classTeacher: classTeacher || null,
      subjectTeachers: subjectTeachers.map(teacher => ({
        subject: teacher.subject ? teacher.subject.name : 'General',
        teacher: {
          name: teacher.name,
          email: teacher.email,
          phone: teacher.phone
        }
      }))
    };
    
    // For API response
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({
        success: true,
        ...teachersData,
        student
      });
    }
    
    // For web view
    res.render('student-portal/teachers', { 
      student,
      ...teachersData,
      error: req.flash('error'),
      success: req.flash('success')
    });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({ success: false, message: 'Error fetching teachers' });
    }
    req.flash('error', 'Error loading teachers');
    res.redirect('/student/dashboard');
  }
});

// Process Fee Payment
router.post('/fees/pay', isStudentAuthenticated, async (req, res) => {
  try {
    const { feeId, amount, paymentMethod, paymentType, installmentId } = req.body;
    const Fee = require('../models/Fee');
    
    const fee = await Fee.findById(feeId);
    
    if (!fee) {
      return res.status(404).json({ success: false, message: 'Fee record not found' });
    }
    
    // Validate payment amount
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }
    
    // Check if student is paying for this fee
    if (fee.student.toString() !== req.session.student.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    if (paymentType === 'full') {
      // Full Payment
      const remainingAmount = fee.amount - fee.paid;
      
      if (paymentAmount > remainingAmount) {
        return res.status(400).json({ success: false, message: 'Payment amount exceeds remaining balance' });
      }
      
      // Add payment record
      fee.payments.push({
        amount: paymentAmount,
        date: new Date(),
        paymentMethod,
        transactionId: `TXN${Date.now()}`,
        receivedBy: 'Online Portal',
        remarks: 'Full payment'
      });
      
      fee.paid += paymentAmount;
      
      // Update status
      if (fee.paid >= fee.amount) {
        fee.status = 'Paid';
      } else if (fee.paid > 0) {
        fee.status = 'Partial';
      }
      
    } else if (paymentType === 'installment') {
      // Installment Payment
      if (!fee.hasInstallmentPlan) {
        return res.status(400).json({ success: false, message: 'No installment plan exists for this fee' });
      }
      
      const installment = fee.installments.id(installmentId);
      
      if (!installment) {
        return res.status(404).json({ success: false, message: 'Installment not found' });
      }
      
      const remainingInstallmentAmount = installment.amount - installment.paidAmount;
      
      if (paymentAmount > remainingInstallmentAmount) {
        return res.status(400).json({ success: false, message: 'Payment amount exceeds installment balance' });
      }
      
      // Update installment
      installment.paidAmount += paymentAmount;
      installment.paidDate = new Date();
      
      if (installment.paidAmount >= installment.amount) {
        installment.status = 'Paid';
      } else if (installment.paidAmount > 0) {
        installment.status = 'Partial';
      }
      
      // Add payment record
      fee.payments.push({
        amount: paymentAmount,
        date: new Date(),
        paymentMethod,
        transactionId: `TXN${Date.now()}`,
        receivedBy: 'Online Portal',
        remarks: `Installment ${installment.installmentNumber} payment`
      });
      
      fee.paid += paymentAmount;
      
      // Update overall fee status
      if (fee.paid >= fee.amount) {
        fee.status = 'Paid';
      } else if (fee.paid > 0) {
        fee.status = 'Partial';
      }
    }
    
    await fee.save();
    
    res.json({ 
      success: true, 
      message: 'Payment processed successfully',
      fee: {
        total: fee.amount,
        paid: fee.paid,
        pending: fee.amount - fee.paid,
        status: fee.status
      }
    });
    
  } catch (error) {
    console.error('Error processing payment:', error);
    res.status(500).json({ success: false, message: 'Error processing payment' });
  }
});

// Get Installment Notifications
router.get('/fees/installment-notifications', isStudentAuthenticated, async (req, res) => {
  try {
    const Fee = require('../models/Fee');
    
    const fees = await Fee.find({ 
      student: req.session.student.id,
      hasInstallmentPlan: true 
    });
    
    const notifications = [];
    const today = new Date();
    
    fees.forEach(fee => {
      fee.installments.forEach(installment => {
        if (installment.status !== 'Paid') {
          const dueDate = new Date(installment.dueDate);
          const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
          
          let notificationType = 'info';
          let message = '';
          
          if (daysUntilDue < 0) {
            notificationType = 'danger';
            message = `Installment ${installment.installmentNumber} for ${fee.term} is ${Math.abs(daysUntilDue)} days overdue!`;
          } else if (daysUntilDue === 0) {
            notificationType = 'warning';
            message = `Installment ${installment.installmentNumber} for ${fee.term} is due today!`;
          } else if (daysUntilDue <= 7) {
            notificationType = 'warning';
            message = `Installment ${installment.installmentNumber} for ${fee.term} is due in ${daysUntilDue} days`;
          } else if (daysUntilDue <= 30) {
            notificationType = 'info';
            message = `Installment ${installment.installmentNumber} for ${fee.term} is due in ${daysUntilDue} days`;
          }
          
          if (message) {
            notifications.push({
              type: notificationType,
              message,
              feeId: fee._id,
              installmentId: installment._id,
              installmentNumber: installment.installmentNumber,
              amount: installment.amount,
              paidAmount: installment.paidAmount,
              dueDate: installment.dueDate,
              daysUntilDue
            });
          }
        }
      });
    });
    
    // Sort by urgency (overdue first, then by days until due)
    notifications.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
    
    res.json({ success: true, notifications });
    
  } catch (error) {
    console.error('Error fetching installment notifications:', error);
    res.status(500).json({ success: false, message: 'Error fetching notifications' });
  }
});

// Notes Page
router.get('/notes', isStudentAuthenticated, async (req, res) => {
  try {
    const student = await Student.findById(req.session.student.id).populate('class');
    const Note = require('../models/Note');
    
    const { subject } = req.query;
    
    let filter = {
      class: student.class._id,
      isPublic: true
    };
    
    if (subject) {
      filter.subject = subject;
    }
    
    const notes = await Note.find(filter)
      .populate('subject')
      .populate('teacher', 'name')
      .sort({ createdAt: -1 });
    
    // Get unique subjects for filter
    const Subject = require('../models/Subject');
    const subjects = await Subject.find({ class: student.class._id });
    
    // For API/mobile app requests
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({
        success: true,
        student,
        notes,
        subjects,
        filters: { subject }
      });
    }
    
    res.render('student-portal/notes', {
      student: req.session.student,
      studentDetails: student,
      notes,
      subjects,
      filters: { subject: subject || '' },
      page: 'notes'
    });
    
  } catch (error) {
    console.error('Error loading notes:', error);
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({ success: false, message: 'Error loading notes' });
    }
    res.status(500).send('Error loading notes');
  }
});

// Download Note Attachment
router.get('/notes/:id/download', isStudentAuthenticated, async (req, res) => {
  try {
    const Note = require('../models/Note');
    const note = await Note.findById(req.params.id);
    
    if (!note || !note.attachment || !note.attachment.path) {
      return res.status(404).json({ success: false, message: 'Attachment not found' });
    }
    
    const path = require('path');
    const filePath = path.join(__dirname, '..', note.attachment.path);
    
    res.download(filePath, note.attachment.originalName);
    
  } catch (error) {
    console.error('Error downloading note:', error);
    res.status(500).json({ success: false, message: 'Error downloading attachment' });
  }
});

// Test Papers Page
router.get('/testpapers', isStudentAuthenticated, async (req, res) => {
  try {
    const student = await Student.findById(req.session.student.id).populate('class');
    const TestPaper = require('../models/TestPaper');
    
    const { subject, examType } = req.query;
    
    let filter = {
      class: student.class._id
    };
    
    if (subject) {
      filter.subject = subject;
    }
    
    if (examType) {
      filter.examType = examType;
    }
    
    const testPapers = await TestPaper.find(filter)
      .populate('subject')
      .populate('teacher', 'name')
      .sort({ date: -1 });
    
    // Get unique subjects for filter
    const Subject = require('../models/Subject');
    const subjects = await Subject.find({ class: student.class._id });
    
    const examTypes = ['Quiz', 'Test', 'Mid-Term', 'Final', 'Assignment', 'Practice'];
    
    // For API/mobile app requests
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({
        success: true,
        student,
        testPapers,
        subjects,
        examTypes,
        filters: { subject, examType }
      });
    }
    
    res.render('student-portal/testpapers', {
      student: req.session.student,
      studentDetails: student,
      testPapers,
      subjects,
      examTypes,
      filters: { subject: subject || '', examType: examType || '' },
      page: 'testpapers'
    });
    
  } catch (error) {
    console.error('Error loading test papers:', error);
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(500).json({ success: false, message: 'Error loading test papers' });
    }
    res.status(500).send('Error loading test papers');
  }
});

// Download Test Paper
router.get('/testpapers/:id/download', isStudentAuthenticated, async (req, res) => {
  try {
    const TestPaper = require('../models/TestPaper');
    const testPaper = await TestPaper.findById(req.params.id);
    
    if (!testPaper || !testPaper.file || !testPaper.file.path) {
      return res.status(404).json({ success: false, message: 'Test paper not found' });
    }
    
    // Increment download count
    testPaper.downloads += 1;
    await testPaper.save();
    
    const path = require('path');
    const filePath = path.join(__dirname, '..', testPaper.file.path);
    
    res.download(filePath, testPaper.file.originalName);
    
  } catch (error) {
    console.error('Error downloading test paper:', error);
    res.status(500).json({ success: false, message: 'Error downloading test paper' });
  }
});

// Student Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  
  // For API/mobile app requests
  if (req.xhr || req.headers.accept.indexOf('json') > -1) {
    return res.json({ success: true, message: 'Logged out successfully' });
  }
  
  res.redirect('/student/login');
});

module.exports = router;
