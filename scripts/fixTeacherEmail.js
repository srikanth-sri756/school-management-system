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

const User = mongoose.model('User', userSchema);

async function fixTeacherEmail() {
  try {
    console.log('=== Fixing Teacher Email ===\n');
    
    const user = await User.findOne({ email: 'demoking' });
    
    if (!user) {
      console.log('❌ User not found!');
      mongoose.connection.close();
      return;
    }
    
    console.log('Found user:');
    console.log('Current email:', user.email);
    console.log('Name:', user.name);
    console.log('Role:', user.role);
    
    // Update email to proper format
    user.email = 'demoking@gmail.com';
    await user.save();
    
    console.log('\n✅ Email updated to: demoking@gmail.com');
    console.log('\nYou can now login with:');
    console.log('Email: demoking@gmail.com');
    console.log('Password: (your password)');
    
    mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  } catch (error) {
    console.error('Error:', error);
    mongoose.connection.close();
  }
}

fixTeacherEmail();
