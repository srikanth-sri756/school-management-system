const mongoose = require('mongoose');

const TeacherSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  section: { type: String },
  isClassTeacher: { type: Boolean, default: false },
  joinDate: { type: Date, default: Date.now },
  salary: { type: Number },
  address: { type: String }
});

module.exports = mongoose.model('Teacher', TeacherSchema);
