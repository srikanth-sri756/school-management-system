// Uploaded files are kept in MongoDB (GridFS bucket "files") instead of on the server's
// disk, so they survive restarts and redeploys on hosts without a permanent disk, such
// as Render's free plan. Files are saved under a unique generated name; that name is what
// the rest of the app stores (photo.filename, receipt.filename, answerSheetFile, ...).
//
// Files uploaded before this change are still on disk; sendStoredFile and
// removeStoredFile fall back to those when a name isn't found in the database.
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

let bucket = null;
let bucketDb = null;
function getBucket() {
  if (mongoose.connection.readyState !== 1) throw new Error('The database is not connected, so the file could not be saved.');
  if (!bucket || bucketDb !== mongoose.connection.db) {
    bucketDb = mongoose.connection.db;
    bucket = new mongoose.mongo.GridFSBucket(bucketDb, { bucketName: 'files' });
  }
  return bucket;
}

// Extension from the checked file type where we know it, otherwise a cleaned-up
// version of the uploaded name's extension
const EXTENSIONS = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'text/plain': '.txt'
};
function extensionFor(file) {
  if (EXTENSIONS[file.mimetype]) return EXTENSIONS[file.mimetype];
  const ext = path.extname(file.originalname || '').toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : '';
}

const uniqueName = (prefix, file) =>
  `${prefix}-${Date.now()}-${Math.round(Math.random() * 1E9)}${extensionFor(file)}`;

// A multer storage engine that streams each upload into GridFS.
// `prefix` is a name prefix ("photo", "receipt", ...) or a function (req, file) => prefix.
// The resulting req.file has filename (the stored name), size and id.
function gridStorage(prefix) {
  return {
    _handleFile(req, file, cb) {
      let upload;
      const filename = uniqueName(typeof prefix === 'function' ? prefix(req, file) : prefix, file);
      try {
        upload = getBucket().openUploadStream(filename, {
          contentType: file.mimetype,
          metadata: { originalName: file.originalname, field: file.fieldname }
        });
      } catch (error) {
        return cb(error);
      }
      file.stream.pipe(upload)
        .on('error', cb)
        .on('finish', () => cb(null, { filename, id: upload.id, size: upload.length }));
    },
    _removeFile(req, file, cb) {
      removeStoredFile(file.filename).then(() => cb(null), cb);
    }
  };
}

const findStored = async (filename) =>
  (await getBucket().find({ filename }).limit(1).toArray())[0] || null;

// Deletes a stored file (every copy with that name), plus any old copy on disk.
// Never throws: a file that is already gone is fine.
async function removeStoredFile(filename, legacyPaths = []) {
  const name = path.basename(String(filename || ''));
  if (name) {
    try {
      const files = await getBucket().find({ filename: name }).toArray();
      await Promise.all(files.map((f) => getBucket().delete(f._id).catch(() => {})));
    } catch (error) {
      console.error('Could not delete stored file', name, error.message);
    }
  }
  await Promise.all(legacyPaths.filter(Boolean).map((p) => fs.promises.unlink(p).catch(() => {})));
}

// Sends a stored file to the browser.
//   download: true sends it as an attachment named downloadName (or the uploaded name)
//   cache: Cache-Control header value
//   legacyPaths: places on disk to look for files uploaded before storage moved to MongoDB
async function sendStoredFile(res, filename, { download = false, downloadName, cache = 'private, max-age=300', legacyPaths = [] } = {}) {
  res.set('Cache-Control', cache);
  res.set('X-Content-Type-Options', 'nosniff');
  const name = path.basename(String(filename || ''));
  const stored = name ? await findStored(name) : null;

  if (stored) {
    if (download) res.attachment(downloadName || (stored.metadata && stored.metadata.originalName) || name);
    else res.set('Content-Disposition', 'inline');
    res.set('Content-Type', stored.contentType || 'application/octet-stream');
    res.set('Content-Length', String(stored.length));
    getBucket().openDownloadStream(stored._id)
      .on('error', (error) => {
        console.error('Could not read stored file', name, error.message);
        if (!res.headersSent) res.status(404).send('Not found');
        else res.destroy();
      })
      .pipe(res);
    return;
  }

  const legacy = legacyPaths.filter(Boolean).find((p) => fs.existsSync(p));
  if (legacy) {
    const done = (err) => { if (err && !res.headersSent) res.status(404).send('Not found'); };
    return download ? res.download(legacy, downloadName || name, done) : res.sendFile(path.resolve(legacy), done);
  }
  res.status(404).send('Not found');
}

module.exports = { gridStorage, sendStoredFile, removeStoredFile, findStored };
