const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');

// Passwords set by the setup script and the teacher import. Anyone still using one is
// reminded (on every page) to change it.
const DEFAULT_PASSWORDS = ['admin123', 'teacher123'];
const MIN_PASSWORD_LENGTH = 8;

const homeFor = (user) => (user && user.role === 'teacher' ? '/teacher/dashboard' : '/dashboard');

// Login page
router.get('/login', (req, res) => {
  if (req.session.user) {
    // Redirect to appropriate dashboard if already logged in
    if (req.session.user.role === 'teacher') {
      return res.redirect('/teacher/dashboard');
    }
    return res.redirect('/dashboard');
  }
  // Flash messages were already read into res.locals by the middleware in server.js
  res.render('login', { error: res.locals.error });
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
      role: user.role,
      usesDefaultPassword: DEFAULT_PASSWORDS.includes(password)
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

// Change your own password (administrators, teachers and staff)
const signedIn = (req, res, next) => (req.session && req.session.user ? next() : res.redirect('/login'));

router.get('/account/password', signedIn, (req, res) => {
  res.render('account/password', { user: req.session.user, page: 'account-password', minLength: MIN_PASSWORD_LENGTH });
});

router.post('/account/password', signedIn, async (req, res) => {
  const back = '/account/password';
  try {
    const { currentPassword = '', newPassword = '', confirmPassword = '' } = req.body;
    const user = await User.findById(req.session.user.id);
    if (!user || !user.password) {
      req.flash('error', 'Your account could not be found. Please sign in again.');
      return res.redirect('/login');
    }

    let error = null;
    if (!(await bcrypt.compare(String(currentPassword), user.password))) error = 'Your current password is not correct.';
    else if (String(newPassword).length < MIN_PASSWORD_LENGTH) error = `The new password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
    else if (newPassword !== confirmPassword) error = 'The new passwords do not match.';
    else if (newPassword === currentPassword) error = 'Choose a password different from your current one.';
    else if (DEFAULT_PASSWORDS.includes(newPassword)) error = 'That password is too easy to guess. Please choose another.';
    if (error) {
      req.flash('error', error);
      return res.redirect(back);
    }

    user.password = await bcrypt.hash(String(newPassword), 10);
    await user.save();
    req.session.user.usesDefaultPassword = false;
    req.flash('success', 'Your password has been changed. Use the new one next time you sign in.');
    res.redirect(homeFor(req.session.user));
  } catch (error) {
    console.error('Change password error:', error);
    req.flash('error', 'Your password could not be changed. Please try again.');
    res.redirect(back);
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;
