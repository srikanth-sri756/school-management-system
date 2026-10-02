require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Class = require('./models/Class');
const Subject = require('./models/Subject');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/school_management';

async function initializeDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin user exists
    const adminExists = await User.findOne({ email: 'admin@school.com' });
    
    if (!adminExists) {
      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        name: 'Administrator',
        email: 'admin@school.com',
        password: hashedPassword,
        role: 'admin'
      });
      console.log('✅ Admin user created');
      console.log('   Email: admin@school.com');
      console.log('   Password: admin123');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    // Create default classes if they don't exist
    const classCount = await Class.countDocuments();
    if (classCount === 0) {
      await Class.insertMany([
        { name: 'Class 1', section: 'A', capacity: 30 },
        { name: 'Class 1', section: 'B', capacity: 30 },
        { name: 'Class 2', section: 'A', capacity: 30 },
        { name: 'Class 2', section: 'B', capacity: 30 },
        { name: 'Class 3', section: 'A', capacity: 30 },
        { name: 'Class 4', section: 'A', capacity: 30 },
        { name: 'Class 5', section: 'A', capacity: 30 }
      ]);
      console.log('✅ Default classes created');
    } else {
      console.log('ℹ️  Classes already exist');
    }

    // Create default subjects if they don't exist
    const subjectCount = await Subject.countDocuments();
    if (subjectCount === 0) {
      await Subject.insertMany([
        { name: 'Mathematics', code: 'MATH101' },
        { name: 'Science', code: 'SCI101' },
        { name: 'English', code: 'ENG101' },
        { name: 'Social Studies', code: 'SS101' },
        { name: 'Computer Science', code: 'CS101' },
        { name: 'Physical Education', code: 'PE101' },
        { name: 'Art', code: 'ART101' }
      ]);
      console.log('✅ Default subjects created');
    } else {
      console.log('ℹ️  Subjects already exist');
    }

    console.log('\n✅ Database initialization complete!');
    console.log('\n📌 Next steps:');
    console.log('   1. Start the server: npm start');
    console.log('   2. Visit http://localhost:3000');
    console.log('   3. Login with: admin@school.com / admin123');
    console.log('   4. Go to /admin/import to import student data\n');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

initializeDatabase();
