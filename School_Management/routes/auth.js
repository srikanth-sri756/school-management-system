const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');

// Login page
router.get('/login', (req, res) => {
  if (req.session.user) {
    // Redirect to appropriate dashboard if already logged in
    if (req.session.user.role === 'teacher') {
      return res.redirect('/teacher/dashboard');
    }
    return res.redirect('/dashboard');
  }
  res.render('login', { error: req.flash('error') });
});

// Login handler
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/login');
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      req.flash('error', 'Invalid email or password');
      return res.redirect('/login');
    }
    
    // Set session
    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    
    // Redirect based on role
    if (user.role === 'teacher') {
      return res.redirect('/teacher/dashboard');
    }
    
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Login error:', error);
    req.flash('error', 'An error occurred during login');
    res.redirect('/login');
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;
