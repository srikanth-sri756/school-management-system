const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

mongoose.connect('mongodb://127.0.0.1:27017/school_management')
  .then(async () => {
    console.log('Connected to MongoDB\n');
    
    // Find teacher user
    const teacher = await User.findOne({ email: 'demoking@gmail.com' });
    
    if (!teacher) {
      console.log('❌ Teacher not found!');
      mongoose.connection.close();
      return;
    }
    
    console.log('✅ Teacher found:');
    console.log(`   Email: ${teacher.email}`);
    console.log(`   Name: ${teacher.name}`);
    console.log(`   Role: ${teacher.role}`);
    console.log(`   Password Hash: ${teacher.password.substring(0, 30)}...`);
    
    // Test password comparison
    const testPassword = 'teacher123';
    console.log(`\nTesting password: "${testPassword}"`);
    
    const isMatch = await bcrypt.compare(testPassword, teacher.password);
    
    if (isMatch) {
      console.log('✅ Password matches! Login should work.\n');
    } else {
      console.log('❌ Password does NOT match!');
      console.log('\nLet me reset the password to "teacher123"...\n');
      
      const newHash = await bcrypt.hash('teacher123', 10);
      teacher.password = newHash;
      await teacher.save();
      
      console.log('✅ Password reset successfully!');
      console.log('\nPlease try logging in again with:');
      console.log('Email: demoking@gmail.com');
      console.log('Password: teacher123\n');
    }
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
