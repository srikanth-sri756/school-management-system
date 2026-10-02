const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const Subject = require('../models/Subject');
const ClassModel = require('../models/Class');
const { requireAdmin } = require('../middleware/auth');
const { uploadPersonFiles, removePrivateFile, fileInfo } = require('../config/multer');
const { TEACHER_DOCUMENTS, mergeDocuments, missingDocuments, readBankDetails, listLabels } = require('../config/documents');

// Teacher management is administrator-only
router.use(requireAdmin);

// Parses the multipart teacher form (photo + identity documents). Uploaded files are
// deleted again unless the handler saves them (it sets req.uploadsSaved), e.g. when
// validation fails.
const teacherUpload = uploadPersonFiles(TEACHER_DOCUMENTS.map(doc => doc.key));

const firstFile = (req, field) => req.files && req.files[field] && req.files[field][0];
const uploader = (req) => req.session.user.name || req.session.user.email;

// Express 4 does not catch errors thrown by async handlers
const safe = (handler) => (req, res, next) => handler(req, res, next).catch(next);

// The class + section a teacher is assigned to: { class, section } (both null when
// none is chosen), or { error } when the choice is incomplete. A class teacher needs one.
async function classAssignment(body) {
  const classTeacher = body.isClassTeacher === 'yes';
  if (!body.grade && !classTeacher) return { class: null, section: null };
  const cls = await ClassModel.forGradeAndSection(body.grade, body.section);
  if (!cls) return { error: classTeacher ? 'A class teacher needs a class and section.' : 'Choose a section for the class.' };
  return { class: cls._id, section: cls.section };
}

// Renders the add form again with what was typed (never the passwords) and the problems found
async function renderAddForm(req, res, problems, bankDetails) {
  const subjects = await Subject.find();
  const classes = await ClassModel.ordered();
  const { password, confirmPassword, ...values } = req.body;
  res.status(422).render('teachers/add', {
    subjects, classes, user: req.session.user, page: 'teachers',
    values: { ...values, bankDetails }, formErrors: problems
  });
}

// List all teachers
router.get('/', safe(async (req, res) => {
  const teachers = await Teacher.find().populate('subject class user');
  res.render('teachers/list', { teachers, user: req.session.user, page: 'teachers' });
}));

// Add teacher form
router.get('/add', safe(async (req, res) => {
  const subjects = await Subject.find();
  const classes = await ClassModel.ordered();
  res.render('teachers/add', { subjects, classes, user: req.session.user, page: 'teachers' });
}));

// Add teacher POST
router.post('/add', teacherUpload, async (req, res) => {
  let userId = null;
  try {
    const { name, email, phone, subject, salary, address, isClassTeacher, createLogin, username, password, confirmPassword } = req.body;

    // Everything is checked before anything is saved
    const { details: bankDetails, errors: problems } = readBankDetails(req.body, true);
    const assignment = await classAssignment(req.body);
    if (assignment.error) problems.push(assignment.error);
    const documents = mergeDocuments('teacher', [], req.files, null, uploader(req)).documents;
    const missingFiles = missingDocuments('teacher', { documents, bankDetails }).filter(label => label !== 'Bank details');
    if (missingFiles.length) problems.push(`Upload the ${listLabels(missingFiles)}.`);
    if (email && await Teacher.exists({ email })) problems.push('A teacher with this email already exists.');
    if (createLogin === 'yes') {
      if (!password || password.length < 6) problems.push('The password must be at least 6 characters long.');
      else if (password !== confirmPassword) problems.push('The passwords do not match.');
      else if (await User.exists({ email: username || email })) problems.push('That username is already taken.');
    }
    if (problems.length) return renderAddForm(req, res, problems, bankDetails);

    if (createLogin === 'yes') {
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

    // Class + section (checked above)
    if (assignment.class) {
      teacherData.class = assignment.class;
      teacherData.section = assignment.section;
    }

    const photo = firstFile(req, 'photo');
    if (photo) teacherData.photo = fileInfo(photo);
    teacherData.documents = documents;
    teacherData.bankDetails = bankDetails;

    await Teacher.create(teacherData);
    req.uploadsSaved = true;

    req.flash('success', 'Teacher added successfully');
    res.redirect('/teachers');
  } catch (error) {
    console.error('Error adding teacher:', error);
    // Don't leave a login behind for a teacher that was not saved
    if (userId) await User.findByIdAndDelete(userId).catch(() => {});
    req.flash('error', 'Error adding teacher: ' + error.message);
    res.redirect('/teachers/add');
  }
});

// Edit teacher
router.get('/:id/edit', safe(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id).populate('subject class user').catch(() => null);
  if (!teacher) {
    req.flash('error', 'That teacher could not be found.');
    return res.redirect('/teachers');
  }
  const subjects = await Subject.find();
  const classes = await ClassModel.ordered();
  res.render('teachers/edit', { teacher, subjects, classes, user: req.session.user, page: 'teachers' });
}));

router.post('/:id/edit', teacherUpload, async (req, res) => {
  try {
    const { name, email, phone, subject, salary, address, isClassTeacher, newUsername, newPassword, confirmNewPassword, createLogin, username, password, confirmPassword } = req.body;

    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.redirect('/teachers');

    // Bank details may be left empty for now, but what is entered must be valid
    const { details: bankDetails, errors: bankErrors } = readBankDetails(req.body, false);
    if (bankErrors.length) {
      req.flash('error', bankErrors.join(' '));
      return res.redirect(`/teachers/${req.params.id}/edit#bank`);
    }

    const assignment = await classAssignment(req.body);
    if (assignment.error) {
      req.flash('error', assignment.error);
      return res.redirect(`/teachers/${req.params.id}/edit`);
    }

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

    // Class + section (checked above)
    updateData.class = assignment.class;
    updateData.section = assignment.section;

    // Photo: replace with a new upload, or remove on request
    const oldPhoto = teacher.photo && teacher.photo.filename;
    const photo = firstFile(req, 'photo');
    if (photo) {
      updateData.photo = fileInfo(photo);
    } else if (req.body.removePhoto === 'yes' && oldPhoto) {
      updateData.$unset = { photo: 1 };
    }

    // Documents (add, replace or remove) and bank details
    const { documents, obsoleteFiles } = mergeDocuments('teacher', teacher.documents, req.files, req.body.removeDoc, uploader(req));
    updateData.documents = documents;
    updateData.bankDetails = bankDetails;

    // Update teacher basic info
    await Teacher.findByIdAndUpdate(req.params.id, updateData);
    req.uploadsSaved = true;
    if (oldPhoto && (photo || updateData.$unset)) removePrivateFile('photo', oldPhoto);
    obsoleteFiles.forEach(filename => removePrivateFile('document', filename));

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
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (teacher) {
      if (teacher.user) await User.findByIdAndDelete(teacher.user);
      if (teacher.photo) removePrivateFile('photo', teacher.photo.filename);
      (teacher.documents || []).forEach(doc => removePrivateFile('document', doc.filename));
      await Teacher.findByIdAndDelete(req.params.id);
      req.flash('success', 'Teacher deleted');
    }
  } catch (error) {
    console.error('Error deleting teacher:', error);
    req.flash('error', 'Error deleting teacher');
  }
  res.redirect('/teachers');
});

module.exports = router;
