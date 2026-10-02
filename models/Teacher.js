const mongoose = require('mongoose');
const DocumentSchema = require('./documentSchema');

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
  address: { type: String },
  // Photo uploaded by an administrator (stored privately in storage/photos)
  photo: {
    filename: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    uploadedAt: { type: Date }
  },
  // Identity documents (Aadhaar, PAN, bank proof) uploaded by an administrator
  documents: { type: [DocumentSchema], default: [] },
  // Salary account
  bankDetails: {
    accountHolder: { type: String, trim: true },
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifsc: { type: String, trim: true, uppercase: true },
    branch: { type: String, trim: true }
  }
});

module.exports = mongoose.model('Teacher', TeacherSchema);
