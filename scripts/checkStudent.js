const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school-management', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const studentSchema = new mongoose.Schema({
  studentId: String,
  name: String,
  email: String,
  dob: Date,
  gender: String,
  address: String,
  phone: String,
  parent: {
    name: String,
    phone: String,
    email: String
  },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  enrollmentDate: Date,
  password: String
});

const Student = mongoose.model('Student', studentSchema);

async function checkStudent() {
  try {
    console.log('Checking student STU0001...\n');
    
    const student = await Student.findOne({ studentId: 'STU0001' });
    
    if (!student) {
      console.log('❌ Student STU0001 not found in database!');
      console.log('Please check if the student exists.');
      mongoose.connection.close();
      return;
    }
    
    console.log('✅ Student found!');
    console.log('Student ID:', student.studentId);
    console.log('Name:', student.name);
    console.log('Email:', student.email);
    console.log('DOB:', student.dob);
    console.log('Has password:', !!student.password);
    
    if (student.password) {
      console.log('\n--- Testing password ---');
      const testPassword = '04012018';
      const isMatch = await bcrypt.compare(testPassword, student.password);
      console.log('Password "04012018" matches:', isMatch);
      
      if (!isMatch) {
        console.log('\n❌ Password does not match!');
        console.log('Generating new password from DOB...');
        
        if (student.dob) {
          const dob = new Date(student.dob);
          const day = String(dob.getDate()).padStart(2, '0');
          const month = String(dob.getMonth() + 1).padStart(2, '0');
          const year = dob.getFullYear();
          const correctPassword = `${day}${month}${year}`;
          
          console.log('Expected password format (DDMMYYYY):', correctPassword);
          
          // Update password
          const hashedPassword = await bcrypt.hash(correctPassword, 10);
          student.password = hashedPassword;
          await student.save();
          
          console.log('✅ Password updated successfully!');
          console.log('Try logging in with:', correctPassword);
        } else {
          console.log('❌ No DOB found for student');
        }
      } else {
        console.log('✅ Password is correct!');
      }
    } else {
      console.log('\n❌ No password set for this student!');
      console.log('Setting password from DOB...');
      
      if (student.dob) {
        const dob = new Date(student.dob);
        const day = String(dob.getDate()).padStart(2, '0');
        const month = String(dob.getMonth() + 1).padStart(2, '0');
        const year = dob.getFullYear();
        const password = `${day}${month}${year}`;
        
        console.log('Password will be (DDMMYYYY):', password);
        
        const hashedPassword = await bcrypt.hash(password, 10);
        student.password = hashedPassword;
        await student.save();
        
        console.log('✅ Password set successfully!');
      } else {
        console.log('❌ No DOB found for student');
      }
    }
    
    mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
}

checkStudent();
