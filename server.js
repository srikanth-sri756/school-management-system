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

// Inline SVG icon from the sprite in public/images/icons.svg, e.g. <%- icon('trophy') %>
app.locals.icon = (name, className = '') =>
  `<svg class="icon ${className}" aria-hidden="true" focusable="false"><use href="/images/icons.svg#${name}"></use></svg>`;

// Public-site photography, e.g. <%- photo('home-hero', { eager: true }) %> (see config/images.js)
app.locals.photo = require('./config/images').photo;

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// Coloured status pill for attendance, fee and student statuses, e.g. <%- statusBadge(fee.status) %>
const STATUS_TONES = {
  present: 'success', paid: 'success', active: 'success',
  late: 'warning', partial: 'warning', 'half-day': 'warning', pending: 'warning',
  absent: 'danger', unpaid: 'danger', overdue: 'danger', inactive: 'danger',
  leave: 'violet'
};
app.locals.statusBadge = (status) => {
  if (!status) return '<span class="text-muted">—</span>';
  const tone = STATUS_TONES[String(status).toLowerCase()] || 'navy';
  return `<span class="badge badge-${tone}">${escapeHtml(status)}</span>`;
};

// Letter grade chip, e.g. <%- gradeBadge(mark.grade) %>
app.locals.gradeBadge = (grade) => {
  if (!grade) return '<span class="grade grade-none">—</span>';
  const letter = String(grade).charAt(0).toUpperCase();
  const tone = { A: 'a', B: 'b', C: 'c' }[letter] || 'f';
  return `<span class="grade grade-${tone}">${escapeHtml(grade)}</span>`;
};

// YYYY-MM-DD in local time, for <input type="date"> values and date filters
app.locals.isoDate = (value) => {
  const d = value ? new Date(value) : null;
  if (!d || isNaN(d)) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Two-letter initials for avatars
app.locals.initials = (...parts) => parts.join(' ').split(/\s+/).filter(Boolean)
  .slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join('') || '?';

// Round avatar: the person's photo if an administrator uploaded one, otherwise initials.
//   <%- avatar('student', student) %>   <%- avatar('teacher', teacher, 'avatar--lg') %>
app.locals.avatar = (kind, person, className = '') => {
  if (!person) return `<span class="avatar ${className}">?</span>`;
  const label = kind === 'teacher' ? person.name : [person.firstName, person.lastName].filter(Boolean).join(' ');
  const text = app.locals.initials(label || '');
  if (person.photo && person.photo.filename && person._id) {
    const version = person.photo.uploadedAt ? new Date(person.photo.uploadedAt).getTime() : '';
    return `<span class="avatar has-photo ${className}"><img src="/media/${kind}s/${person._id}/photo?v=${version}" alt="${escapeHtml(label)}" loading="lazy"></span>`;
  }
  return `<span class="avatar ${className}" aria-hidden="true">${escapeHtml(text)}</span>`;
};

// Classes the school runs: Nursery, LKG, UKG, Class 1-10, sections A-D (see config/classes.js)
const schoolClasses = require('./config/classes');
app.locals.GRADES = schoolClasses.GRADES;
app.locals.SECTIONS = schoolClasses.SECTIONS;
app.locals.classLabel = schoolClasses.classLabel;

// Important dates (see config/dates.js and models/Announcement.js)
const dates = require('./config/dates');
app.locals.dateRange = dates.dateRange;
app.locals.dateParts = dates.dateParts;
app.locals.whenLabel = dates.whenLabel;
app.locals.dayValue = (value) => (typeof value === 'string' ? value : dates.dayValue(value));

// Admission / identity documents (see config/documents.js)
const documents = require('./config/documents');
app.locals.documentTypes = documents.documentTypes;
app.locals.documentChecklist = documents.documentChecklist;
app.locals.missingDocuments = documents.missingDocuments;
app.locals.maskAccount = documents.maskAccount;
app.locals.fileSize = (bytes) => (bytes >= 1048576
  ? `${(bytes / 1048576).toFixed(1)} MB`
  : `${Math.max(1, Math.round((bytes || 0) / 1024))} KB`);
// Documents column in the student / teacher lists: "Complete", or what is still missing
app.locals.documentsStatus = (kind, person) => {
  const missing = documents.missingDocuments(kind, person);
  if (!missing.length) return '<span class="badge badge-success">Complete</span>';
  return `<span class="badge badge-warning">${missing.length} missing</span><span class="cell-sub">${escapeHtml(missing.join(', '))}</span>`;
};

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(methodOverride('_method'));

// Session configuration. In production (Render) the app runs behind an HTTPS proxy:
// trust it so login cookies can be marked secure (sent over HTTPS only).
const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) app.set('trust proxy', 1);
app.use(session({
  secret: process.env.SESSION_SECRET || 'school_management_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 3600000, // 1 hour
    sameSite: 'lax',
    secure: isProduction,
    httpOnly: true // Prevent XSS attacks
  }
}));

app.use(flash());

// Make flash messages available in all views
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  // Kept separately so pages that pass their own `error`/`success` still show the flash toast
  res.locals.flash = { success: res.locals.success, error: res.locals.error };
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
const mediaRoutes = require('./routes/media');
const announcementRoutes = require('./routes/announcements');


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
app.use('/media', mediaRoutes);
app.use('/announcements', announcementRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { user: req.session.user });
});

// Start server
app.listen(PORT, () => {
  console.log(`School Management System running on http://localhost:${PORT}`);
  console.log(`Default login: admin@school.com / admin123`);
});
