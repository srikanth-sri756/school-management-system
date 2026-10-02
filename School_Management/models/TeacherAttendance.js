const mongoose = require('mongoose');

const TeacherAttendanceSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late', 'Half-Day', 'Leave'],
    required: true
  },
  checkIn: {
    type: String
  },
  checkOut: {
    type: String
  },
  notes: {
    type: String
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for faster queries
TeacherAttendanceSchema.index({ teacher: 1, date: 1 });

module.exports = mongoose.model('TeacherAttendance', TeacherAttendanceSchema);
