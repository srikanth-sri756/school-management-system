const mongoose = require('mongoose');

const RemarkSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  remark: { type: String, required: true },
  type: { type: String, enum: ['Positive', 'Negative', 'Neutral'], default: 'Neutral' },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Remark', RemarkSchema);
