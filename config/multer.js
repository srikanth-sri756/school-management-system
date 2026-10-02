const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadsDir = path.join(__dirname, '../uploads');
const notesDir = path.join(uploadsDir, 'notes');
const questionPapersDir = path.join(uploadsDir, 'question-papers');

[uploadsDir, notesDir, questionPapersDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration for Notes
const notesStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, notesDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'note-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Storage configuration for Question Papers
const questionPapersStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, questionPapersDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'qp-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to accept specific file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'text/plain'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, images, and TXT files are allowed.'), false);
  }
};

// Multer upload configurations
const uploadNote = multer({
  storage: notesStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter
});

const uploadQuestionPaper = multer({
  storage: questionPapersStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: fileFilter
});

// General upload (for backward compatibility)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fileFilter
});

// ---------------------------------------------------------------------------
// Private files (photos and fee receipts). These live outside the public
// /uploads folder and are only served through routes/media.js, which checks
// who is signed in.
// ---------------------------------------------------------------------------
const privateDir = path.join(__dirname, '../storage');
const photosDir = path.join(privateDir, 'photos');
const receiptsDir = path.join(privateDir, 'receipts');
const documentsDir = path.join(privateDir, 'documents');
[privateDir, photosDir, receiptsDir, documentsDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// The stored extension comes from the checked file type, never from the uploaded
// name, so a file is always served back as the type it was accepted as.
const EXTENSIONS = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};
const uniqueName = (prefix, file) =>
  `${prefix}-${Date.now()}-${Math.round(Math.random() * 1E9)}${EXTENSIONS[file.mimetype] || ''}`;

const privateStorage = (dir, prefix) => multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => cb(null, uniqueName(prefix, file))
});

const typeFilter = (allowed, message) => (req, file, cb) => {
  if (allowed.includes(file.mimetype)) return cb(null, true);
  const error = new Error(message);
  error.code = 'INVALID_FILE_TYPE';
  cb(error, false);
};

const uploadPhoto = multer({
  storage: privateStorage(photosDir, 'photo'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: typeFilter(['image/jpeg', 'image/png', 'image/webp'], 'Photos must be JPG, PNG or WebP images.')
});

const uploadReceipt = multer({
  storage: privateStorage(receiptsDir, 'receipt'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: typeFilter(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], 'Receipts must be a PDF or a JPG, PNG or WebP image.')
});

// Runs a multer middleware and turns upload errors into a flash message
// instead of an error page.
const withUploadErrors = (middleware) => (req, res, next) => {
  middleware(req, res, (err) => {
    if (!err) return next();
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'That file is too large.' : err.message;
    req.flash('error', message);
    return res.redirect(req.get('Referrer') || '/dashboard');
  });
};

// Deletes a stored private file, ignoring files that are already gone.
const removePrivateFile = (kind, filename) => {
  if (!filename) return;
  const dir = { receipt: receiptsDir, document: documentsDir }[kind] || photosDir;
  fs.promises.unlink(path.join(dir, path.basename(filename))).catch(() => {});
};

// ---------------------------------------------------------------------------
// Student / teacher forms: an optional photo plus one file per document type,
// sent as fields "photo" and "doc_<key>" (e.g. doc_aadhaar).
// ---------------------------------------------------------------------------
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const PHOTO_MAX = 5 * 1024 * 1024;
const DOCUMENT_MAX = 10 * 1024 * 1024;

const personFilesStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, file.fieldname === 'photo' ? photosDir : documentsDir),
  filename: (req, file, cb) => cb(null, uniqueName(file.fieldname === 'photo' ? 'photo' : 'doc', file))
});

// Everything multer accepted, as a flat list
const uploadedFiles = (req) => Object.values(req.files || {}).flat();

const removeUploadedFiles = (req) => uploadedFiles(req).forEach((file) =>
  removePrivateFile(file.fieldname === 'photo' ? 'photo' : 'document', file.filename));

// Parses a multipart person form. `documentKeys` lists the document types the form
// may send. Afterwards req.files.photo / req.files['doc_<key>'] hold the uploads.
// Unless the route handler sets req.uploadsSaved = true, every uploaded file is
// deleted again once the response is sent (validation errors, crashes, ...).
const uploadPersonFiles = (documentKeys) => {
  const parser = multer({
    storage: personFilesStorage,
    limits: { fileSize: DOCUMENT_MAX, files: documentKeys.length + 1 },
    fileFilter: (req, file, cb) => {
      const isPhoto = file.fieldname === 'photo';
      if ((isPhoto ? PHOTO_TYPES : DOCUMENT_TYPES).includes(file.mimetype)) return cb(null, true);
      const error = new Error(isPhoto
        ? 'Photos must be JPG, PNG or WebP images.'
        : 'Documents must be a PDF or a JPG, PNG or WebP image.');
      error.code = 'INVALID_FILE_TYPE';
      cb(error, false);
    }
  }).fields([{ name: 'photo', maxCount: 1 }, ...documentKeys.map((key) => ({ name: `doc_${key}`, maxCount: 1 }))]);

  return [
    withUploadErrors(parser),
    (req, res, next) => {
      if (!uploadedFiles(req).length) return next();
      res.on('finish', () => { if (!req.uploadsSaved) removeUploadedFiles(req); });
      const photo = req.files.photo && req.files.photo[0];
      if (photo && photo.size > PHOTO_MAX) {
        req.flash('error', 'The photo is too large (5 MB at most).');
        return res.redirect(req.get('Referrer') || '/dashboard');
      }
      next();
    }
  ];
};

// Metadata stored on the student / teacher for an uploaded file
const fileInfo = (file) => ({
  filename: file.filename,
  mimeType: file.mimetype,
  size: file.size,
  uploadedAt: new Date()
});

module.exports = {
  upload,
  uploadNote,
  uploadQuestionPaper,
  uploadPhoto,
  uploadReceipt,
  uploadPersonFiles,
  withUploadErrors,
  removePrivateFile,
  removeUploadedFiles,
  fileInfo,
  photosDir,
  receiptsDir,
  documentsDir
};
