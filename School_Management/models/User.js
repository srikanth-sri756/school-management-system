const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String }, // hashed
  role: { type: String, enum: ['admin','teacher','staff'], default: 'admin' },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
