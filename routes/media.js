// Serves private files (photos and fee receipts) after checking who is asking.
//   Photos: any signed-in staff account, or the student the photo belongs to.
//   Receipts: administrators, or the student the fee belongs to.
//   Documents (Aadhaar, PAN, transfer certificates, ...): administrators only.
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const router = express.Router();
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Fee = require('../models/Fee');
const { photosDir, receiptsDir, documentsDir } = require('../config/multer');
const { documentTypes } = require('../config/documents');

const isStaff = (req) => Boolean(req.session && req.session.user);
const isAdmin = (req) => isStaff(req) && req.session.user.role === 'admin';
const studentId = (req) => req.session && req.session.student && String(req.session.student.id);
const validId = (id) => mongoose.Types.ObjectId.isValid(id);

const notFound = (res) => res.status(404).send('Not found');
// Express 4 does not catch errors thrown by async handlers
const safe = (handler) => (req, res, next) => handler(req, res, next).catch(next);

function sendPrivate(res, dir, filename, { download = false, downloadName, cache = 'private, max-age=300' } = {}) {
  res.set('Cache-Control', cache);
  res.set('X-Content-Type-Options', 'nosniff');
  const file = path.join(dir, path.basename(filename));
  if (download) return res.download(file, downloadName || path.basename(filename), (err) => err && !res.headersSent && notFound(res));
  return res.sendFile(file, (err) => err && !res.headersSent && notFound(res));
}

// Student photo
router.get('/students/:id/photo', safe(async (req, res) => {
  const { id } = req.params;
  if (!validId(id)) return notFound(res);
  if (!isStaff(req) && studentId(req) !== id) return res.status(403).send('Forbidden');
  const student = await Student.findById(id).select('photo').lean();
  if (!student || !student.photo || !student.photo.filename) return notFound(res);
  return sendPrivate(res, photosDir, student.photo.filename);
}));

// Teacher photo (staff only)
router.get('/teachers/:id/photo', safe(async (req, res) => {
  const { id } = req.params;
  if (!validId(id)) return notFound(res);
  if (!isStaff(req)) return res.status(403).send('Forbidden');
  const teacher = await Teacher.findById(id).select('photo').lean();
  if (!teacher || !teacher.photo || !teacher.photo.filename) return notFound(res);
  return sendPrivate(res, photosDir, teacher.photo.filename);
}));

// Fee receipt: /media/receipts/:feeId/:receiptId (add ?download=1 to save it)
router.get('/receipts/:feeId/:receiptId', safe(async (req, res) => {
  const { feeId, receiptId } = req.params;
  if (!validId(feeId) || !validId(receiptId)) return notFound(res);
  if (!isAdmin(req) && !studentId(req)) return isStaff(req) ? res.status(403).send('Forbidden') : res.redirect('/student/login');

  const fee = await Fee.findById(feeId).select('student term receipts').lean();
  if (!fee) return notFound(res);
  if (!isAdmin(req) && String(fee.student) !== studentId(req)) return res.status(403).send('Forbidden');

  const receipt = (fee.receipts || []).find(r => String(r._id) === receiptId);
  if (!receipt) return notFound(res);
  return sendPrivate(res, receiptsDir, receipt.filename, {
    download: req.query.download === '1',
    downloadName: receipt.originalName || `receipt-${fee.term}${path.extname(receipt.filename)}`
  });
}));

// Student / teacher document: /media/documents/students/:id/:docId (add ?download=1 to save it)
const OWNERS = {
  students: { model: Student, kind: 'student', fields: 'firstName lastName documents', name: (s) => [s.firstName, s.lastName].filter(Boolean).join(' ') },
  teachers: { model: Teacher, kind: 'teacher', fields: 'name documents', name: (t) => t.name }
};
router.get('/documents/:owner/:id/:docId', safe(async (req, res) => {
  const owner = Object.hasOwn(OWNERS, req.params.owner) ? OWNERS[req.params.owner] : null;
  const { id, docId } = req.params;
  if (!owner || !validId(id) || !validId(docId)) return notFound(res);
  if (!isAdmin(req)) return isStaff(req) ? res.status(403).send('Forbidden') : res.redirect('/login');

  const person = await owner.model.findById(id).select(owner.fields).lean();
  const doc = person && (person.documents || []).find(d => String(d._id) === docId);
  if (!doc) return notFound(res);
  const type = documentTypes(owner.kind).find(t => t.key === doc.type);
  return sendPrivate(res, documentsDir, doc.filename, {
    download: req.query.download === '1',
    downloadName: `${owner.name(person)} - ${type ? type.label : doc.type}${path.extname(doc.filename)}`,
    cache: 'private, no-store'
  });
}));

module.exports = router;
