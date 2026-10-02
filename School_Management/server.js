require('dotenv').config();
// Initialize database connection (MongoDB via mongoose)
require('./config/db');
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const bodyParser = require('body-parser');
const path = require('path');
const methodOverride = require('method-override');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for mobile app access
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true, // Allow credentials (cookies, sessions)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Cookie', 'Set-Cookie']
}));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'school_management_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 3600000, // 1 hour
    sameSite: 'lax', // Use 'lax' for local development (same-site requests)
    secure: false, // Set to true in production with HTTPS
    httpOnly: true // Prevent XSS attacks
  }
}));

app.use(flash());

// Make flash messages available in all views
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// Routes
const authRoutes = require('./routes/auth');
const portfolioRoutes = require('./routes/portfolio');
const dashboardRoutes = require('./routes/dashboard');
const studentRoutes = require('./routes/students');
const attendanceRoutes = require('./routes/attendance');
const teacherAttendanceRoutes = require('./routes/teacher-attendance');
const marksRoutes = require('./routes/marks');
const holidayRoutes = require('./routes/holidays');

const adminRoutes = require('./routes/admin');
const feeRoutes = require('./routes/fees');
const teacherManagementRoutes = require('./routes/teachers');
const teacherPortalRoutes = require('./routes/teacher');
const studentPortalRoutes = require('./routes/student-portal');


app.use('/', portfolioRoutes);
app.use('/', authRoutes);
app.use('/', dashboardRoutes);
app.use('/students', studentRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/teacher-attendance', teacherAttendanceRoutes);
app.use('/holidays', holidayRoutes);
app.use('/marks', marksRoutes);
app.use('/admin', adminRoutes);
app.use('/fees', feeRoutes);
app.use('/teachers', teacherManagementRoutes);
app.use('/teacher', teacherPortalRoutes);
app.use('/student', studentPortalRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { user: req.session.user });
});

// Start server
app.listen(PORT, () => {
  console.log(`School Management System running on http://localhost:${PORT}`);
  console.log(`Default login: admin@school.com / admin123`);
});
