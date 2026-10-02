const mongoose = require('mongoose');

// The database to use: MONGODB_URI if it is set. In production (Render) the Atlas
// string may also be stored as ATLAS_URI. Locally, ATLAS_URI is only used by setup
// scripts, so the app on your computer keeps using the local database.
const isProduction = process.env.NODE_ENV === 'production';
const MONGODB_URI = (process.env.MONGODB_URI || '').trim()
  || (isProduction ? (process.env.ATLAS_URI || '').trim() : '')
  || 'mongodb://127.0.0.1:27017/school_management';

// Never print the password: mongodb+srv://user:secret@host → mongodb+srv://user:***@host
const safeUri = MONGODB_URI.replace(/\/\/([^:/@]+):[^@]*@/, '//$1:***@');

mongoose.set('strictQuery', true);

mongoose.connect(MONGODB_URI).then(() => {
  console.log(`Connected to MongoDB: ${safeUri}`);
}).catch(err => {
  console.error(`Failed to connect to MongoDB (${safeUri}):`, err.message);
});

module.exports = mongoose;
