const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const Subject = require('../models/Subject');
const ClassModel = require('../models/Class');

// List all teachers
router.get('/', async (req, res) => {
  const teachers = await Teacher.find().populate('subject class user');
  res.render('teachers/list', { teachers, user: req.session.user, page: 'teachers' });
});

// Add teacher form
router.get('/add', async (req, res) => {
  const subjects = await Subject.find();
  const classes = await ClassModel.find();
  res.render('teachers/add', { subjects, classes, user: req.session.user, page: 'teachers' });
});

// Add teacher POST
router.post('/add', async (req, res) => {
  try {
    const { name, email, phone, subject, class: classId, section, salary, address, isClassTeacher, createLogin, username, password, confirmPassword } = req.body;
    
    let userId = null;
    if (createLogin === 'yes') {
      // Validate password
      if (!password || password.length < 6) {
        req.flash('error', 'Password must be at least 6 characters long');
        return res.redirect('/teachers/add');
      }
      
      if (password !== confirmPassword) {
        req.flash('error', 'Passwords do not match');
        return res.redirect('/teachers/add');
      }
      
      // Check if username already exists
      const existingUser = await User.findOne({ email: username || email });
      if (existingUser) {
        req.flash('error', 'Username/Email already exists');
        return res.redirect('/teachers/add');
      }
      
      // Create user account with custom credentials
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({ 
        name, 
        email: username || email, // Use username as email for login
        password: hashedPassword, 
        role: 'teacher' 
      });
      userId = user._id;
    }
    
    // Prepare teacher data, handling empty strings for ObjectId fields
    const teacherData = {
      user: userId, 
      name, 
      email, 
      phone, 
      isClassTeacher: isClassTeacher === 'yes',
      salary, 
      address 
    };

    // Only add subject if it's not empty
    if (subject && subject.trim() !== '') {
      teacherData.subject = subject;
    }

    // Only add class if it's not empty
    if (classId && classId.trim() !== '') {
      teacherData.class = classId;
    }

    // Only add section if class teacher is selected and section is provided
    if (isClassTeacher === 'yes' && section && section.trim() !== '') {
      teacherData.section = section;
    }

    await Teacher.create(teacherData);
    
    req.flash('success', 'Teacher added successfully');
    res.redirect('/teachers');
  } catch (error) {
    console.error('Error adding teacher:', error);
    req.flash('error', 'Error adding teacher: ' + error.message);
    res.redirect('/teachers/add');
  }
});

// Edit teacher
router.get('/:id/edit', async (req, res) => {
  const teacher = await Teacher.findById(req.params.id).populate('subject class user');
  const subjects = await Subject.find();
  const classes = await ClassModel.find();
  res.render('teachers/edit', { teacher, subjects, classes, user: req.session.user, page: 'teachers' });
});

router.post('/:id/edit', async (req, res) => {
  try {
    const { name, email, phone, subject, class: classId, section, salary, address, isClassTeacher, newUsername, newPassword, confirmNewPassword, createLogin, username, password, confirmPassword } = req.body;
    
    const teacher = await Teacher.findById(req.params.id);
    
    // Prepare update data, handling empty strings for ObjectId fields
    const updateData = {
      name, 
      email, 
      phone, 
      isClassTeacher: isClassTeacher === 'yes',
      salary, 
      address 
    };

    // Only update subject if it's not empty
    if (subject && subject.trim() !== '') {
      updateData.subject = subject;
    } else {
      updateData.subject = null;
    }

    // Only update class if it's not empty
    if (classId && classId.trim() !== '') {
      updateData.class = classId;
    } else {
      updateData.class = null;
    }

    // Only update section if class teacher is selected and section is provided
    if (isClassTeacher === 'yes' && section && section.trim() !== '') {
      updateData.section = section;
    } else {
      updateData.section = null;
    }
    
    // Update teacher basic info
    await Teacher.findByIdAndUpdate(req.params.id, updateData);
    
    // Handle password change for existing user
    if (teacher.user && newPassword) {
      if (newPassword !== confirmNewPassword) {
        req.flash('error', 'Passwords do not match');
        return res.redirect(`/teachers/${req.params.id}/edit`);
      }
      
      if (newPassword.length < 6) {
        req.flash('error', 'Password must be at least 6 characters long');
        return res.redirect(`/teachers/${req.params.id}/edit`);
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updateData = { password: hashedPassword };
      
      // Update username if provided
      if (newUsername && newUsername.trim() !== '') {
        const existingUser = await User.findOne({ email: newUsername, _id: { $ne: teacher.user } });
        if (existingUser) {
          req.flash('error', 'Username already exists');
          return res.redirect(`/teachers/${req.params.id}/edit`);
        }
        updateData.email = newUsername;
      }
      
      await User.findByIdAndUpdate(teacher.user, updateData);
      req.flash('success', 'Teacher and login credentials updated successfully');
    }
    // Create new login access
    else if (!teacher.user && createLogin === 'yes') {
      if (!password || password.length < 6) {
        req.flash('error', 'Password must be at least 6 characters long');
        return res.redirect(`/teachers/${req.params.id}/edit`);
      }
      
      if (password !== confirmPassword) {
        req.flash('error', 'Passwords do not match');
        return res.redirect(`/teachers/${req.params.id}/edit`);
      }
      
      const existingUser = await User.findOne({ email: username || email });
      if (existingUser) {
        req.flash('error', 'Username/Email already exists');
        return res.redirect(`/teachers/${req.params.id}/edit`);
      }
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create({ 
        name, 
        email: username || email,
        password: hashedPassword, 
        role: 'teacher' 
      });
      
      await Teacher.findByIdAndUpdate(req.params.id, { user: user._id });
      req.flash('success', 'Teacher updated and login access created');
    } else {
      req.flash('success', 'Teacher updated successfully');
    }
    
    res.redirect('/teachers');
  } catch (error) {
    console.error('Error updating teacher:', error);
    req.flash('error', 'Error updating teacher: ' + error.message);
    res.redirect(`/teachers/${req.params.id}/edit`);
  }
});

// Delete teacher
router.post('/:id/delete', async (req, res) => {
  const teacher = await Teacher.findById(req.params.id);
  if (teacher.user) {
    await User.findByIdAndDelete(teacher.user);
  }
  await Teacher.findByIdAndDelete(req.params.id);
  res.redirect('/teachers');
});

module.exports = router;
