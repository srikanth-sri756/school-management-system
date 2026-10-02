const mongoose = require('mongoose');

const HolidaySchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true },
  description: { type: String },
  type: { 
    type: String, 
    enum: ['National', 'Religious', 'Festival', 'School Event', 'Other'],
    default: 'Other'
  },
  isRecurring: { type: Boolean, default: false }, // For annual holidays
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

// Index for faster date queries
HolidaySchema.index({ date: 1 });

module.exports = mongoose.model('Holiday', HolidaySchema);
