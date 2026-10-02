const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  isPublic: { type: Boolean, default: true },
  // File attachment support
  attachment: {
    filename: { type: String },
    originalName: { type: String },
    path: { type: String },
    size: { type: Number },
    mimetype: { type: String },
    uploadDate: { type: Date, default: Date.now }
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Note', NoteSchema);
