// Script to set default passwords for all students
// Run this script with: node scripts/setStudentPasswords.js

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Student = require('../models/Student');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/school_management';

async function setDefaultPasswords() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all students without passwords
    const students = await Student.find({ $or: [{ password: { $exists: false } }, { password: null }] });
    
    console.log(`Found ${students.length} students without passwords`);

    let count = 0;
    
    for (const student of students) {
      // Create default password from date of birth (DDMMYYYY format)
      const dob = new Date(student.dateOfBirth);
      const day = String(dob.getDate()).padStart(2, '0');
      const month = String(dob.getMonth() + 1).padStart(2, '0');
      const year = dob.getFullYear();
      const defaultPassword = `${day}${month}${year}`;
      
      // Hash the password
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      // Update student
      student.password = hashedPassword;
      await student.save();
      
      count++;
      console.log(`✓ Password set for ${student.studentId} (${student.firstName} ${student.lastName}) - Default: ${defaultPassword}`);
    }

    console.log(`\n✅ Successfully set passwords for ${count} students`);
    console.log('\nDefault password format: DDMMYYYY (Date of Birth)');
    console.log('Students can change their password after first login');
    
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    
  } catch (error) {
    console.error('Error setting passwords:', error);
    process.exit(1);
  }
}

// Run the script
setDefaultPasswords();
