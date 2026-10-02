const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { isGrade, isSection, compareClasses } = require('../config/classes');

// One class + section, e.g. "Class 5" / "B" (see config/classes.js)
const ClassSchema = new Schema({
  name: { type: String, required: true },
  section: { type: String },
  capacity: { type: Number, default: 0 }
}, { timestamps: true });

// All classes in school order: Nursery A, Nursery B, LKG A, ... Class 10 D
ClassSchema.statics.ordered = async function (filter = {}) {
  const classes = await this.find(filter);
  return classes.sort(compareClasses);
};

// The Class record for a class + section, created if it doesn't exist yet.
// Returns null when either value is not one the school uses.
ClassSchema.statics.forGradeAndSection = async function (grade, section) {
  if (!isGrade(grade) || !isSection(section)) return null;
  return this.findOneAndUpdate(
    { name: grade, section },
    { $setOnInsert: { name: grade, section, capacity: 30 } },
    { upsert: true, new: true }
  );
};

module.exports = mongoose.model('Class', ClassSchema);
