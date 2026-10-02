const express = require('express');
const router = express.Router();
const Holiday = require('../models/Holiday');

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/auth/login');
};

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  req.flash('error', 'Access denied. Admin only.');
  res.redirect('/dashboard');
};

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

// Check if date is working day (API endpoint)
router.get('/check-working-day', isAuthenticated, async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.json({ error: 'Date is required' });
    }

    const checkDate = new Date(date);
    
    // Check if Sunday
    if (isSunday(checkDate)) {
      return res.json({ 
        isWorkingDay: false, 
        reason: 'Sunday - Weekly Off',
        type: 'sunday'
      });
    }

    // Check if holiday
    const holiday = await isHoliday(checkDate);
    if (holiday) {
      return res.json({ 
        isWorkingDay: false, 
        reason: holiday.title,
        description: holiday.description,
        type: 'holiday'
      });
    }

    res.json({ isWorkingDay: true });
  } catch (error) {
    console.error('Check working day error:', error);
    res.json({ error: 'Error checking date' });
  }
});

// Get all holidays
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const holidays = await Holiday.find()
      .populate('createdBy', 'name email')
      .sort({ date: 1 });

    const user = req.session.user;

    res.render('holidays/index', {
      user,
      holidays,
      page: 'holidays',
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Holidays list error:', error);
    res.status(500).send('Error loading holidays');
  }
});

// Get add holiday form
router.get('/add', isAdmin, (req, res) => {
  res.render('holidays/add', {
    user: req.session.user,
    page: 'holidays',
    success: req.flash('success'),
    error: req.flash('error')
  });
});

// Add new holiday
router.post('/add', isAdmin, async (req, res) => {
  try {
    const { title, date, description, type, isRecurring } = req.body;

    if (!title || !date) {
      req.flash('error', 'Title and date are required');
      return res.redirect('/holidays/add');
    }

    // Check if it's a Sunday
    if (isSunday(new Date(date))) {
      req.flash('error', 'Cannot add holiday on Sunday (already a weekly off)');
      return res.redirect('/holidays/add');
    }

    // Check if holiday already exists on this date
    const existingHoliday = await isHoliday(new Date(date));
    if (existingHoliday) {
      req.flash('error', `A holiday already exists on this date: ${existingHoliday.title}`);
      return res.redirect('/holidays/add');
    }

    await Holiday.create({
      title,
      date: new Date(date),
      description,
      type,
      isRecurring: isRecurring === 'true',
      createdBy: req.session.user.id
    });

    req.flash('success', 'Holiday added successfully!');
    res.redirect('/holidays');
  } catch (error) {
    console.error('Add holiday error:', error);
    req.flash('error', 'Error adding holiday. Please try again.');
    res.redirect('/holidays/add');
  }
});

// Delete holiday
router.post('/:id/delete', isAdmin, async (req, res) => {
  try {
    await Holiday.findByIdAndDelete(req.params.id);
    req.flash('success', 'Holiday deleted successfully');
    res.redirect('/holidays');
  } catch (error) {
    console.error('Delete holiday error:', error);
    req.flash('error', 'Error deleting holiday');
    res.redirect('/holidays');
  }
});

module.exports = router;
module.exports.isSunday = isSunday;
module.exports.isHoliday = isHoliday;
