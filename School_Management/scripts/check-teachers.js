const mongoose = require('mongoose');
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Subject = require('../models/Subject');
const Class = require('../models/Class');

mongoose.connect('mongodb://127.0.0.1:27017/school_management')
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Find all users with teacher role
    const teacherUsers = await User.find({ role: 'teacher' });
    console.log('\n=== Teacher Accounts ===');
    console.log(`Found ${teacherUsers.length} teacher accounts:\n`);
    
    for (const user of teacherUsers) {
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.name}`);
      console.log(`Role: ${user.role}`);
      console.log(`Has Password: ${user.password ? 'Yes' : 'No'}`);
      
      // Find associated teacher record
      const teacher = await Teacher.findOne({ user: user._id }).populate('subject class');
      if (teacher) {
        console.log(`Teacher Name: ${teacher.name}`);
        console.log(`Phone: ${teacher.phone || 'N/A'}`);
        console.log(`Subject: ${teacher.subject ? teacher.subject.name : 'N/A'}`);
        console.log(`Class: ${teacher.class ? teacher.class.name : 'N/A'}`);
      }
      console.log('---\n');
    }
    
    console.log('\nYou can login with:');
    console.log('Email: demoking@gmail.com');
    console.log('Password: teacher123');
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
