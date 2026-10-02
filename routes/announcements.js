// Important dates: the administrator adds a title, date(s) and details, and chooses
// where it appears (website, student portal, teacher portal). Items disappear from
// those places by themselves once their last day has passed.
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { requireAdmin } = require('../middleware/auth');
const { parseDay, startOfToday } = require('../config/dates');

router.use(requireAdmin);

// Express 4 does not catch errors thrown by async handlers
const safe = (handler) => (req, res, next) => handler(req, res, next).catch(next);
const AUDIENCE_KEYS = Object.keys(Announcement.AUDIENCES);

// Reads the form: { data, values, errors }. `values` is what was typed, for showing
// the form again when something is wrong.
function readForm(body) {
  const title = String(body.title || '').trim();
  const details = String(body.details || '').trim();
  const date = parseDay(body.date);
  const endDate = body.endDate ? parseDay(body.endDate) : null;
  const chosen = [].concat(body.audience || []);
  const audience = Object.fromEntries(AUDIENCE_KEYS.map((key) => [key, chosen.includes(key)]));

  const errors = [];
  if (!title) errors.push('Enter a title.');
  else if (title.length > 120) errors.push('Keep the title to 120 characters or fewer.');
  if (details.length > 1000) errors.push('Keep the details to 1000 characters or fewer.');
  if (!date) errors.push('Choose the date.');
  if (body.endDate && !endDate) errors.push('The end date is not a valid date.');
  if (date && endDate && endDate < date) errors.push('The end date must be on or after the start date.');
  if (!AUDIENCE_KEYS.some((key) => audience[key])) errors.push('Choose at least one place to show it.');

  return {
    // A one-day item has no end date
    data: { title, details, date, endDate: endDate && date && endDate > date ? endDate : null, audience },
    values: { title, details, date: body.date || '', endDate: body.endDate || '', audience },
    errors
  };
}

const shownOn = (audience) => AUDIENCE_KEYS.filter((key) => audience[key]).map((key) => Announcement.AUDIENCES[key]).join(', ');

const renderForm = (res, options) => res.render('announcements/form', {
  user: res.req.session.user,
  page: 'announcements',
  audiences: Announcement.AUDIENCES,
  formErrors: [],
  ...options
});

// List: upcoming first, then the most recent past ones
router.get('/', safe(async (req, res) => {
  const upcoming = await Announcement.upcoming();
  const past = await Announcement.find({ lastDay: { $lt: startOfToday() } }).sort({ date: -1 }).limit(20).lean();
  res.render('announcements/index', {
    user: req.session.user,
    page: 'announcements',
    upcoming,
    past,
    audiences: Announcement.AUDIENCES
  });
}));

router.get('/add', (req, res) => {
  renderForm(res, { item: { audience: { website: true, students: true, teachers: true } }, isEdit: false });
});

router.post('/add', safe(async (req, res) => {
  const { data, values, errors } = readForm(req.body);
  if (errors.length) return renderForm(res.status(422), { item: values, isEdit: false, formErrors: errors });

  await Announcement.create({ ...data, createdBy: req.session.user.name || req.session.user.email });
  req.flash('success', `“${data.title}” added. It now shows on: ${shownOn(data.audience)}.`);
  res.redirect('/announcements');
}));

router.get('/:id/edit', safe(async (req, res) => {
  const item = mongoose.Types.ObjectId.isValid(req.params.id) ? await Announcement.findById(req.params.id).lean() : null;
  if (!item) {
    req.flash('error', 'That date could not be found.');
    return res.redirect('/announcements');
  }
  renderForm(res, { item, isEdit: true });
}));

router.post('/:id/edit', safe(async (req, res) => {
  const item = mongoose.Types.ObjectId.isValid(req.params.id) ? await Announcement.findById(req.params.id) : null;
  if (!item) {
    req.flash('error', 'That date could not be found.');
    return res.redirect('/announcements');
  }
  const { data, values, errors } = readForm(req.body);
  if (errors.length) return renderForm(res.status(422), { item: { ...values, _id: item._id }, isEdit: true, formErrors: errors });

  item.set(data);
  await item.save();
  req.flash('success', `“${data.title}” updated.`);
  res.redirect('/announcements');
}));

router.post('/:id/delete', safe(async (req, res) => {
  const item = mongoose.Types.ObjectId.isValid(req.params.id) ? await Announcement.findByIdAndDelete(req.params.id) : null;
  if (item) req.flash('success', `“${item.title}” removed. It no longer shows anywhere.`);
  res.redirect('/announcements');
}));

module.exports = router;
