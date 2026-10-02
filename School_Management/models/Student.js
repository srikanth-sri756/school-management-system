const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const StudentSchema = new Schema({
  studentId: { type: String, index: true },
  firstName: { type: String, required: true },
  lastName: { type: String },
  email: { type: String },
  password: { type: String }, // For student login
  dateOfBirth: { type: String },
  gender: { type: String },
  class: { type: Schema.Types.ObjectId, ref: 'Class' },
  section: { type: String },
  rollNumber: { type: String },
  parentName: { type: String },
  parentPhone: { type: String },
  parentEmail: { type: String },
  address: { type: String },
  admissionDate: { type: String },
  status: { type: String, enum: ['Active','Inactive'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('Student', StudentSchema);
