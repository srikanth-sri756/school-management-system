const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AttendanceSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  class: { type: Schema.Types.ObjectId, ref: 'Class' },
  // The school day as "YYYY-MM-DD" (see config/dates.js: localDayKey)
  date: { type: String, required: true },
  status: { type: String, enum: ['Present', 'Late', 'Absent'], required: true },
  remarks: { type: String, maxlength: 200 },
  markedBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

AttendanceSchema.index({ student: 1, date: 1 });

module.exports = mongoose.model('Attendance', AttendanceSchema);
