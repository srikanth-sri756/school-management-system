const mongoose = require('mongoose');
const { startOfToday } = require('../config/dates');

// Where an important date can appear
const AUDIENCES = {
  website: 'Website',
  students: 'Student portal',
  teachers: 'Teacher portal'
};

// An important date the administrator announces (exams, meetings, admissions, events).
// It is shown on the chosen audiences until its last day has passed. Days are stored
// as midnight UTC (see config/dates.js).
const AnnouncementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  details: { type: String, trim: true, maxlength: 1000 },
  date: { type: Date, required: true },
  endDate: { type: Date },
  audience: {
    website: { type: Boolean, default: true },
    students: { type: Boolean, default: true },
    teachers: { type: Boolean, default: true }
  },
  // endDate, or date for a single day; kept up to date so past items can be skipped
  lastDay: { type: Date, index: true },
  createdBy: { type: String }
}, { timestamps: true });

AnnouncementSchema.pre('validate', function (next) {
  if (this.endDate && this.date && this.endDate < this.date) {
    this.invalidate('endDate', 'The end date must be on or after the start date.');
  }
  this.lastDay = this.endDate || this.date;
  next();
});

// Upcoming and current items, soonest first. `audience` is one of AUDIENCES (or
// omitted for all); `limit` 0 means no limit.
AnnouncementSchema.statics.upcoming = function (audience, limit = 0) {
  const filter = { lastDay: { $gte: startOfToday() } };
  if (audience) filter[`audience.${audience}`] = true;
  const query = this.find(filter).sort({ date: 1, title: 1 }).lean();
  return limit ? query.limit(limit) : query;
};

AnnouncementSchema.statics.AUDIENCES = AUDIENCES;

module.exports = mongoose.model('Announcement', AnnouncementSchema);
