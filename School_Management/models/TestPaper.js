const mongoose = require('mongoose');

const TestPaperSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  section: { type: String },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  examType: { 
    type: String, 
    enum: ['Quiz', 'Test', 'Mid-Term', 'Final', 'Assignment', 'Practice'],
    default: 'Test'
  },
  date: { type: Date, required: true },
  maxMarks: { type: Number, required: true },
  description: { type: String },
  // File attachment for question paper
  file: {
    filename: { type: String },
    originalName: { type: String },
    path: { type: String },
    size: { type: Number },
    mimetype: { type: String },
    uploadDate: { type: Date, default: Date.now }
  },
  downloads: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TestPaper', TestPaperSchema);
