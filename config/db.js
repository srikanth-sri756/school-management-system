const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/school_management';

mongoose.set('strictQuery', true);

mongoose.connect(MONGODB_URI).then(() => {
  console.log(`Connected to MongoDB: ${MONGODB_URI}`);
}).catch(err => {
  console.error('Failed to connect to MongoDB:', err.message);
});

module.exports = mongoose;
