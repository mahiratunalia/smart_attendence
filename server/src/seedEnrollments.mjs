import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const courseSchema = new mongoose.Schema({
  name: String,
  code: String,
  teacherId: mongoose.Schema.Types.ObjectId,
  students: [mongoose.Schema.Types.ObjectId]
});

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
  studentId: String
});

const Course = mongoose.model('Course', courseSchema);
const User = mongoose.model('User', userSchema);

async function seedEnrollments() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-system');
    console.log('✅ Connected to MongoDB');

    // Get all students
    const students = await User.find({ role: 'student' });
    console.log(`👨‍🎓 Found ${students.length} students`);

    // Get all courses
    const courses = await Course.find();
    console.log(`📚 Found ${courses.length} courses`);

    if (courses.length === 0) {
      console.log('❌ No courses found. Please run seed:lectures first.');
      process.exit(1);
    }

    // Enroll each student in all available courses
    for (const course of courses) {
      course.students = students.map(s => s._id);
      await course.save();
      console.log(`✅ Enrolled ${students.length} students in ${course.code} - ${course.name}`);
    }

    console.log('\n✨ Enrollment completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedEnrollments();
