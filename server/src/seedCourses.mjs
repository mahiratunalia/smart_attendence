import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const courseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  description: String,
  credits: { type: Number, default: 3 },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  semester: String,
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String
});

const departmentSchema = new mongoose.Schema({
  name: String,
  code: String
});

const Course = mongoose.model('Course', courseSchema);
const User = mongoose.model('User', userSchema);
const Department = mongoose.model('Department', departmentSchema);

const coursesData = [
  {
    name: 'Introduction to Computer Science',
    code: 'CSE101',
    description: 'Fundamental concepts of computing and programming.',
    teacherEmail: 'dr.ahmed.khalid@university.edu',
    deptCode: 'CSE'
  },
  {
    name: 'Data Structures and Algorithms',
    code: 'CSE201',
    description: 'Study of data structures and algorithm design analysis.',
    teacherEmail: 'prof.sarah.williams@university.edu',
    deptCode: 'CSE'
  },
  {
    name: 'Database Systems',
    code: 'CSE301',
    description: 'Design and implementation of database systems.',
    teacherEmail: 'dr.muhammad.hassan@university.edu',
    deptCode: 'CSE'
  },
  {
    name: 'Software Engineering',
    code: 'SWE401',
    description: 'Principles of software engineering and development life cycle.',
    teacherEmail: 'prof.emily.johnson@university.edu',
    deptCode: 'SWE'
  },
  {
    name: 'Artificial Intelligence',
    code: 'CSE402',
    description: 'Introduction to AI, machine learning, and neural networks.',
    teacherEmail: 'dr.rashid.almansouri@university.edu',
    deptCode: 'CSE'
  },
  {
    name: 'Web Development',
    code: 'CSE302',
    description: 'Full stack web development technologies.',
    teacherEmail: 'prof.jennifer.lee@university.edu',
    deptCode: 'CSE'
  },
  {
    name: 'Computer Networks',
    code: 'CSE303',
    description: 'Communication protocols, network architecture, and security.',
    teacherEmail: 'dr.ahmed.khalid@university.edu',
    deptCode: 'CSE'
  },
  {
    name: 'Operating Systems',
    code: 'CSE304',
    description: 'Process management, memory management, and file systems.',
    teacherEmail: 'prof.sarah.williams@university.edu',
    deptCode: 'CSE'
  },
  {
    name: 'Machine Learning',
    code: 'CSE403',
    description: 'Supervised and unsupervised learning algorithms.',
    teacherEmail: 'dr.rashid.almansouri@university.edu',
    deptCode: 'CSE'
  },
  {
    name: 'Mobile App Development',
    code: 'CSE404',
    description: 'Building applications for iOS and Android platforms.',
    teacherEmail: 'prof.jennifer.lee@university.edu',
    deptCode: 'CSE'
  },
  {
    name: 'Cyber Security',
    code: 'CSE405',
    description: 'Network security, cryptography, and ethical hacking.',
    teacherEmail: 'dr.muhammad.hassan@university.edu',
    deptCode: 'CSE'
  },
  {
    name: 'Cloud Computing',
    code: 'CSE406',
    description: 'Cloud infrastructure, services, and deployment models.',
    teacherEmail: 'prof.emily.johnson@university.edu',
    deptCode: 'CSE'
  }
];

async function seedCourses() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-system');
    console.log('✅ Connected to MongoDB');

    console.log('🗑️  Clearing existing courses...');
    await Course.deleteMany({});

    const teachers = await User.find({ role: 'teacher' });
    const departments = await Department.find();

    if (teachers.length === 0) {
      console.log('❌ No teachers found. Run seed:users first.');
      process.exit(1);
    }

    const coursesToCreate = [];

    for (const courseData of coursesData) {
      const teacher = teachers.find(t => t.email === courseData.teacherEmail);
      const department = departments.find(d => d.code === courseData.deptCode);

      if (teacher) {
        coursesToCreate.push({
          name: courseData.name,
          code: courseData.code,
          description: courseData.description,
          teacherId: teacher._id,
          departmentId: department ? department._id : undefined,
          semester: 'Fall 2024'
        });
      } else {
        console.warn(`⚠️ Teacher not found for ${courseData.code}: ${courseData.teacherEmail}`);
      }
    }

    console.log('📝 Creating courses...');
    const result = await Course.insertMany(coursesToCreate);
    
    console.log(`✅ Successfully created ${result.length} courses`);
    result.forEach(c => console.log(`   - ${c.code}: ${c.name}`));

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedCourses();
