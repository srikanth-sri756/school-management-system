const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  name: { type: String, required: true },
  // Email or username used to sign in; stored in lowercase because the login form
  // lowercases what is typed
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String }, // hashed
  role: { type: String, enum: ['admin','teacher','staff'], default: 'admin' },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
