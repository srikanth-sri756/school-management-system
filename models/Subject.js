const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SubjectSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Subject', SubjectSchema);
