const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ClassSchema = new Schema({
  name: { type: String, required: true },
  section: { type: String },
  capacity: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Class', ClassSchema);
