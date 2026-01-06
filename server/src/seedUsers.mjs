import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher', 'parent', 'admin'], default: 'student' },
  studentId: String,
  departmentId: mongoose.Schema.Types.ObjectId,
}, { timestamps: true });

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Department = mongoose.model('Department', departmentSchema);

const PASSWORD = '23101331';

const users = [
  // Students
  { name: 'Ahmed Hassan', email: 'ahmed.hassan@university.edu', role: 'student', studentId: '2021001001' },
  { name: 'Fatima Khan', email: 'fatima.khan@university.edu', role: 'student', studentId: '2021001002' },
  { name: 'Mohammad Ali', email: 'mohammad.ali@university.edu', role: 'student', studentId: '2021001003' },
  { name: 'Zainab Ahmed', email: 'zainab.ahmed@university.edu', role: 'student', studentId: '2021001004' },
  { name: 'Hassan Ibrahim', email: 'hassan.ibrahim@university.edu', role: 'student', studentId: '2021001005' },
  { name: 'Amina Malik', email: 'amina.malik@university.edu', role: 'student', studentId: '2021001006' },
  { name: 'Karim Syed', email: 'karim.syed@university.edu', role: 'student', studentId: '2021001007' },
  { name: 'Layla Mohammed', email: 'layla.mohammed@university.edu', role: 'student', studentId: '2021001008' },
  
  // Teachers
  { name: 'Dr. Ahmed Khalid', email: 'dr.ahmed.khalid@university.edu', role: 'teacher' },
  { name: 'Prof. Sarah Williams', email: 'prof.sarah.williams@university.edu', role: 'teacher' },
  { name: 'Dr. Muhammad Hassan', email: 'dr.muhammad.hassan@university.edu', role: 'teacher' },
  { name: 'Prof. Emily Johnson', email: 'prof.emily.johnson@university.edu', role: 'teacher' },
  { name: 'Dr. Rashid Al-Mansouri', email: 'dr.rashid.almansouri@university.edu', role: 'teacher' },
  { name: 'Prof. Jennifer Lee', email: 'prof.jennifer.lee@university.edu', role: 'teacher' },
  
  // Parents
  { name: 'Mr. Hassan Ahmed', email: 'hassan.ahmed.parent@university.edu', role: 'parent' },
  { name: 'Mrs. Noor Khan', email: 'noor.khan.parent@university.edu', role: 'parent' },
  { name: 'Mr. Ibrahim Malik', email: 'ibrahim.malik.parent@university.edu', role: 'parent' },
  { name: 'Mrs. Aisha Mohammed', email: 'aisha.mohammed.parent@university.edu', role: 'parent' },
  
  // Admin
  { name: 'Admin User', email: 'admin@university.edu', role: 'admin' },
];

async function seedUsers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-system');
    console.log('✅ Connected to MongoDB');

    // Get departments
    const departments = await Department.find();
    console.log(`📚 Found ${departments.length} departments`);

    console.log('🗑️  Clearing existing users...');
    await User.deleteMany({});
    console.log('✅ Cleared existing users');

    // Hash password
    const hashedPassword = await bcrypt.hash(PASSWORD, 10);

    // Prepare users with department
    const usersToCreate = users.map((user, index) => ({
      ...user,
      password: hashedPassword,
      departmentId: user.role === 'student' && departments.length > 0 
        ? departments[index % departments.length]._id 
        : undefined,
    }));

    console.log('📝 Creating users...');
    const result = await User.insertMany(usersToCreate);
    
    console.log(`✅ Successfully created ${result.length} users:\n`);
    
    const groupedUsers = {
      students: result.filter(u => u.role === 'student'),
      teachers: result.filter(u => u.role === 'teacher'),
      parents: result.filter(u => u.role === 'parent'),
      admin: result.filter(u => u.role === 'admin'),
    };

    console.log('👨‍🎓 STUDENTS:');
    groupedUsers.students.forEach(u => {
      console.log(`   ${u.name} (${u.email}) - ID: ${u.studentId}`);
    });

    console.log('\n👨‍🏫 TEACHERS:');
    groupedUsers.teachers.forEach(u => {
      console.log(`   ${u.name} (${u.email})`);
    });

    console.log('\n👨‍👩‍👧 PARENTS:');
    groupedUsers.parents.forEach(u => {
      console.log(`   ${u.name} (${u.email})`);
    });

    console.log('\n⚙️  ADMIN:');
    groupedUsers.admin.forEach(u => {
      console.log(`   ${u.name} (${u.email})`);
    });

    console.log(`\n🔐 Password for all users: ${PASSWORD}`);
    console.log('\n✨ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedUsers();
