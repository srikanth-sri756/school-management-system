const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/school-management', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: String
});

const teacherSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  address: String,
  qualification: String,
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  dateOfJoining: Date,
  salary: Number,
  status: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const User = mongoose.model('User', userSchema);
const Teacher = mongoose.model('Teacher', teacherSchema);

async function checkUsers() {
  try {
    console.log('=== Checking Users in Database ===\n');
    
    const users = await User.find({});
    
    if (users.length === 0) {
      console.log('❌ No users found in database!');
      console.log('\nYou need to create users first.');
      mongoose.connection.close();
      return;
    }
    
    console.log(`Found ${users.length} users:\n`);
    
    for (const user of users) {
      console.log('----------------------------');
      console.log('Name:', user.name);
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      console.log('Has Password:', !!user.password);
      
      if (user.role === 'teacher') {
        const teacher = await Teacher.findOne({ user: user._id });
        if (teacher) {
          console.log('Teacher Profile Found:', {
            name: teacher.name,
            email: teacher.email,
            status: teacher.status || 'Active'
          });
        } else {
          console.log('⚠️ Teacher profile not found for this user!');
        }
      }
      console.log('');
    }
    
    console.log('\n=== Login Instructions ===');
    console.log('For staff/teacher login:');
    console.log('1. Go to http://localhost:3000/login');
    console.log('2. Use email and password from above');
    console.log('3. Teachers will be redirected to /teacher/dashboard');
    console.log('4. Admins will be redirected to /dashboard');
    
    mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
}

checkUsers();
