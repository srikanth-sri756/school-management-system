// The classes (grades) the school runs, youngest first, and the sections a class can have.
// A Class record in the database is one class + section (e.g. "Class 5", "B"); it is
// created the first time a student or class teacher is assigned to that pair.

const GRADES = ['Nursery', 'LKG', 'UKG', ...Array.from({ length: 10 }, (_, i) => `Class ${i + 1}`)];
const SECTIONS = ['A', 'B', 'C', 'D'];

const isGrade = (name) => GRADES.includes(name);
const isSection = (section) => SECTIONS.includes(section);

// Position in GRADES; unknown names sort after the known ones
const gradeRank = (name) => {
  const index = GRADES.indexOf(name);
  return index === -1 ? GRADES.length : index;
};

// Nursery A, Nursery B, LKG A, ... Class 10 D
const compareClasses = (a, b) =>
  gradeRank(a.name) - gradeRank(b.name)
  || String(a.name).localeCompare(String(b.name))
  || String(a.section || '').localeCompare(String(b.section || ''));

// "Class 5 – B"
const classLabel = (cls) => (cls ? `${cls.name}${cls.section ? ` – ${cls.section}` : ''}` : '');

// Reads a class name typed in a spreadsheet: "class 5", "5", "lkg" → "Class 5", "Class 5", "LKG".
// Returns null for anything the school doesn't run.
const normalizeGrade = (value) => {
  const text = String(value || '').trim().replace(/\s+/g, ' ');
  if (/^\d{1,2}$/.test(text)) return isGrade(`Class ${Number(text)}`) ? `Class ${Number(text)}` : null;
  return GRADES.find((grade) => grade.toLowerCase() === text.toLowerCase()) || null;
};
const normalizeSection = (value) => {
  const section = String(value || '').trim().toUpperCase();
  return isSection(section) ? section : null;
};

module.exports = {
  GRADES, SECTIONS, isGrade, isSection, gradeRank, compareClasses, classLabel, normalizeGrade, normalizeSection
};
