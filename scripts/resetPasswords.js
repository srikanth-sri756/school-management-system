const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school-management');

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String
});

const User = mongoose.model('User', userSchema);

async function testPasswords() {
  try {
    console.log('=== Testing Login Credentials ===\n');
    
    const users = await User.find({});
    
    for (const user of users) {
      console.log('----------------------------');
      console.log('Name:', user.name);
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      
      // Test default passwords
      const testPasswords = ['admin123', 'teacher123', '123456', 'password'];
      
      for (const testPwd of testPasswords) {
        const isMatch = await bcrypt.compare(testPwd, user.password);
        if (isMatch) {
          console.log('✅ Password found:', testPwd);
          break;
        }
      }
      
      console.log('');
    }
    
    console.log('\n=== Resetting Passwords ===\n');
    
    // Reset admin password
    const admin = await User.findOne({ role: 'admin' });
    if (admin) {
      const adminPassword = 'admin123';
      admin.password = await bcrypt.hash(adminPassword, 10);
      await admin.save();
      console.log('✅ Admin password reset to: admin123');
      console.log('   Login with: admin@school.com / admin123');
    }
    
    // Reset teacher password and fix email
    const teacher = await User.findOne({ role: 'teacher' });
    if (teacher) {
      const teacherPassword = 'teacher123';
      teacher.password = await bcrypt.hash(teacherPassword, 10);
      teacher.email = 'demoking@gmail.com'; // Fix email format
      await teacher.save();
      console.log('\n✅ Teacher password reset to: teacher123');
      console.log('   Login with: demoking@gmail.com / teacher123');
    }
    
    console.log('\n=== Login Instructions ===');
    console.log('\nFor Admin Portal:');
    console.log('1. Go to: http://localhost:3000/login');
    console.log('2. Email: admin@school.com');
    console.log('3. Password: admin123');
    console.log('4. Will redirect to: /dashboard');
    
    console.log('\nFor Teacher Portal:');
    console.log('1. Go to: http://localhost:3000/login');
    console.log('2. Email: demoking@gmail.com');
    console.log('3. Password: teacher123');
    console.log('4. Will redirect to: /teacher/dashboard');
    
    mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
}

testPasswords();
