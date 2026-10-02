// Loads upcoming important dates into res.locals.importantDates for a page.
//   router.get('/dashboard', withImportantDates('students', 4), handler)
// A failure here never breaks the page; it just shows no dates.
const Announcement = require('../models/Announcement');

const withImportantDates = (audience, limit = 0) => async (req, res, next) => {
  try {
    res.locals.importantDates = await Announcement.upcoming(audience, limit);
  } catch (error) {
    console.error('Could not load important dates:', error);
    res.locals.importantDates = [];
  }
  next();
};

module.exports = { withImportantDates };
