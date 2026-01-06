import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const lectureSchema = new mongoose.Schema({
  title: { type: String, required: true },
  course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  location: String,
  status: { type: String, enum: ['scheduled', 'active', 'completed', 'cancelled'], default: 'scheduled' },
  attendanceWindowMinutes: { type: Number, default: 15 },
  qrCode: String,
  classroomCode: String,
}, { timestamps: true });

const courseSchema = new mongoose.Schema({
  name: String,
  code: String,
  teacherId: mongoose.Schema.Types.ObjectId
});

const Lecture = mongoose.model('Lecture', lectureSchema);
const Course = mongoose.model('Course', courseSchema);

async function seedLectures() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-system');
    console.log('✅ Connected to MongoDB');

    // Get courses
    const courses = await Course.find();
    if (courses.length === 0) {
      console.log('❌ No courses found. Please run seed:courses first.');
      process.exit(1);
    }
    console.log(`📚 Found ${courses.length} courses`);

    console.log('🗑️  Clearing existing lectures...');
    await Lecture.deleteMany({});

    const lectures = [];
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Helper to format date as YYYY-MM-DD
    const formatDate = (d) => d.toISOString().split('T')[0];

    for (const course of courses) {
      // 1. Active lecture for today (for testing attendance)
      lectures.push({
        title: `Lecture 5: ${course.name} Concepts`,
        course_id: course._id,
        date: today,
        startTime: '09:00',
        endTime: '10:30',
        location: 'Room 301',
        status: 'active',
        classroomCode: '1234'
      });

      // 2. Completed lecture (yesterday)
      lectures.push({
        title: `Lecture 4: Introduction to ${course.code}`,
        course_id: course._id,
        date: yesterday,
        startTime: '11:00',
        endTime: '12:30',
        location: 'Room 101',
        status: 'completed'
      });

      // 3. Scheduled lecture (tomorrow)
      lectures.push({
        title: `Lecture 6: Advanced Topics`,
        course_id: course._id,
        date: tomorrow,
        startTime: '14:00',
        endTime: '15:30',
        location: 'Lab 2',
        status: 'scheduled'
      });
    }

    console.log('📝 Creating lectures...');
    const result = await Lecture.insertMany(lectures);
    
    console.log(`✅ Successfully created ${result.length} lectures`);
    
    // Log a few examples
    const activeLectures = result.filter(l => l.status === 'active');
    console.log(`\n🟢 Active Lectures (Today): ${activeLectures.length}`);
    activeLectures.slice(0, 3).forEach(l => {
      const course = courses.find(c => c._id.equals(l.course_id));
      console.log(`   - ${course?.code}: ${l.title} (Code: ${l.classroomCode})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedLectures();
