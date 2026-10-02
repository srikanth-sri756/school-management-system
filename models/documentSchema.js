const mongoose = require('mongoose');

// A document kept on file for a student or teacher (Aadhaar, transfer certificate,
// PAN, ...). The file itself is stored privately in storage/documents and is only
// served to administrators through routes/media.js. See config/documents.js for
// the document types.
const DocumentSchema = new mongoose.Schema({
  type: { type: String, required: true },
  filename: { type: String, required: true },
  originalName: { type: String },
  mimeType: { type: String },
  size: { type: Number },
  uploadedBy: { type: String },
  uploadedAt: { type: Date, default: Date.now }
});

module.exports = DocumentSchema;
