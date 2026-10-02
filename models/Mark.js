const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MarkSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  subject: { type: Schema.Types.ObjectId, ref: 'Subject' },
  examType: { type: String },
  maxMarks: { type: Number },
  obtainedMarks: { type: Number },
  percentage: { type: Number },
  grade: { type: String },
  date: { type: Date, default: Date.now },
  examDate: { type: String },
  remarks: { type: String },
  answerSheetFile: { type: String }, // File path for uploaded answer sheet
  enteredBy: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Mark', MarkSchema);
