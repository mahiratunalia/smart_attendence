import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const calendarEventSchema = new mongoose.Schema({
  title: String,
  description: String,
  event_type: String,
  start_date: Date,
  end_date: Date,
  course_id: mongoose.Schema.Types.ObjectId,
  location: String,
  color: String,
  all_day: Boolean,
  created_by: mongoose.Schema.Types.ObjectId
}, { timestamps: true });

const courseSchema = new mongoose.Schema({
  name: String,
  code: String,
  teacherId: mongoose.Schema.Types.ObjectId
});

const userSchema = new mongoose.Schema({
  name: String,
  role: String
});

const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);
const Course = mongoose.model('Course', courseSchema);
const User = mongoose.model('User', userSchema);

async function seedCalendarEvents() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-system');
    console.log('✅ Connected to MongoDB');

    // Get courses and teachers
    const courses = await Course.find();
    const teachers = await User.find({ role: 'teacher' });

    if (courses.length === 0) {
      console.log('❌ No courses found. Please run seed:lectures first.');
      process.exit(1);
    }

    console.log(`📚 Found ${courses.length} courses`);

    // Clear existing calendar events
    console.log('🗑️  Clearing existing calendar events...');
    await CalendarEvent.deleteMany({});

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const events = [
      // Lectures (this month)
      {
        title: 'Database Systems Lecture',
        description: 'Advanced SQL queries and optimization',
        event_type: 'lecture',
        start_date: new Date(currentYear, currentMonth, 5, 9, 0),
        end_date: new Date(currentYear, currentMonth, 5, 10, 30),
        course_id: courses[0]?._id,
        location: 'Room 101',
        color: '#3b82f6',
        all_day: false,
        created_by: teachers[0]?._id
      },
      {
        title: 'Web Development Workshop',
        description: 'React and Node.js fundamentals',
        event_type: 'lecture',
        start_date: new Date(currentYear, currentMonth, 8, 11, 0),
        end_date: new Date(currentYear, currentMonth, 8, 12, 30),
        course_id: courses[1]?._id,
        location: 'Lab 203',
        color: '#3b82f6',
        all_day: false,
        created_by: teachers[1]?._id
      },
      {
        title: 'Data Structures Lecture',
        description: 'Trees and graph algorithms',
        event_type: 'lecture',
        start_date: new Date(currentYear, currentMonth, 12, 14, 0),
        end_date: new Date(currentYear, currentMonth, 12, 15, 30),
        course_id: courses[0]?._id,
        location: 'Room 105',
        color: '#3b82f6',
        all_day: false,
        created_by: teachers[0]?._id
      },
      {
        title: 'Software Engineering Lecture',
        description: 'Agile methodology and Scrum',
        event_type: 'lecture',
        start_date: new Date(currentYear, currentMonth, 15, 10, 0),
        end_date: new Date(currentYear, currentMonth, 15, 11, 30),
        course_id: courses[1]?._id,
        location: 'Room 202',
        color: '#3b82f6',
        all_day: false,
        created_by: teachers[1]?._id
      },

      // Exams
      {
        title: 'Mid-Term Exam - Database Systems',
        description: 'Covers chapters 1-5, SQL and normalization',
        event_type: 'exam',
        start_date: new Date(currentYear, currentMonth, 18, 9, 0),
        end_date: new Date(currentYear, currentMonth, 18, 12, 0),
        course_id: courses[0]?._id,
        location: 'Exam Hall A',
        color: '#ef4444',
        all_day: false,
        created_by: teachers[0]?._id
      },
      {
        title: 'Quiz - Web Development',
        description: 'JavaScript and React fundamentals',
        event_type: 'exam',
        start_date: new Date(currentYear, currentMonth, 22, 14, 0),
        end_date: new Date(currentYear, currentMonth, 22, 15, 0),
        course_id: courses[1]?._id,
        location: 'Room 301',
        color: '#ef4444',
        all_day: false,
        created_by: teachers[1]?._id
      },
      {
        title: 'Final Exam - Data Structures',
        description: 'Comprehensive exam covering all topics',
        event_type: 'exam',
        start_date: new Date(currentYear, currentMonth, 28, 10, 0),
        end_date: new Date(currentYear, currentMonth, 28, 13, 0),
        course_id: courses[0]?._id,
        location: 'Exam Hall B',
        color: '#ef4444',
        all_day: false,
        created_by: teachers[0]?._id
      },

      // Assignments
      {
        title: 'Assignment 1: Database Design',
        description: 'Design an ER diagram for e-commerce system',
        event_type: 'assignment',
        start_date: new Date(currentYear, currentMonth, 10, 23, 59),
        course_id: courses[0]?._id,
        color: '#eab308',
        all_day: true,
        created_by: teachers[0]?._id
      },
      {
        title: 'Project Submission - React App',
        description: 'Build a full-stack MERN application',
        event_type: 'assignment',
        start_date: new Date(currentYear, currentMonth, 20, 23, 59),
        course_id: courses[1]?._id,
        color: '#eab308',
        all_day: true,
        created_by: teachers[1]?._id
      },
      {
        title: 'Homework: Algorithm Analysis',
        description: 'Solve problems on time complexity',
        event_type: 'assignment',
        start_date: new Date(currentYear, currentMonth, 25, 23, 59),
        course_id: courses[0]?._id,
        color: '#eab308',
        all_day: true,
        created_by: teachers[0]?._id
      },

      // Holidays
      {
        title: 'University Foundation Day',
        description: 'Campus closed for celebration',
        event_type: 'holiday',
        start_date: new Date(currentYear, currentMonth, 7),
        color: '#22c55e',
        all_day: true,
        created_by: teachers[0]?._id
      },
      {
        title: 'National Holiday',
        description: 'Independence Day celebration',
        event_type: 'holiday',
        start_date: new Date(currentYear, currentMonth, 14),
        color: '#22c55e',
        all_day: true,
        created_by: teachers[0]?._id
      },
      {
        title: 'Reading Week',
        description: 'Self-study period, no classes',
        event_type: 'holiday',
        start_date: new Date(currentYear, currentMonth, 21),
        end_date: new Date(currentYear, currentMonth, 25),
        color: '#22c55e',
        all_day: true,
        created_by: teachers[0]?._id
      }
    ];

    console.log('📝 Creating calendar events...');
    const result = await CalendarEvent.insertMany(events);
    
    console.log(`✅ Successfully created ${result.length} calendar events:\n`);
    
    // Group by type
    const grouped = {
      lecture: result.filter(e => e.event_type === 'lecture'),
      exam: result.filter(e => e.event_type === 'exam'),
      assignment: result.filter(e => e.event_type === 'assignment'),
      holiday: result.filter(e => e.event_type === 'holiday')
    };

    console.log(`📚 Lectures: ${grouped.lecture.length}`);
    grouped.lecture.forEach(e => {
      console.log(`   - ${e.title} on ${e.start_date.toLocaleDateString()}`);
    });

    console.log(`\n📝 Exams: ${grouped.exam.length}`);
    grouped.exam.forEach(e => {
      console.log(`   - ${e.title} on ${e.start_date.toLocaleDateString()}`);
    });

    console.log(`\n📋 Assignments: ${grouped.assignment.length}`);
    grouped.assignment.forEach(e => {
      console.log(`   - ${e.title} due ${e.start_date.toLocaleDateString()}`);
    });

    console.log(`\n🎉 Holidays: ${grouped.holiday.length}`);
    grouped.holiday.forEach(e => {
      console.log(`   - ${e.title} on ${e.start_date.toLocaleDateString()}`);
    });

    console.log('\n✨ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedCalendarEvents();
