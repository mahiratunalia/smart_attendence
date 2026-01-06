import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorRole: { type: String },
    action: { type: String, required: true },
    entityType: { type: String },
    entityId: { type: String },
    meta: { type: Object, default: {} },
    ipAddress: { type: String },
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    role: String,
    studentId: String,
  },
  { timestamps: true }
);

const courseSchema = new mongoose.Schema(
  {
    name: String,
    code: String,
  },
  { timestamps: true }
);

const calendarEventSchema = new mongoose.Schema(
  {
    title: String,
    event_type: String,
    start_date: Date,
    end_date: Date,
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
const User = mongoose.model('User', userSchema);
const Course = mongoose.model('Course', courseSchema);
const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);

async function seedAuditLogs() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-system');
    console.log('✅ Connected');

    const admin = await User.findOne({ role: 'admin' }).select('_id role name email');
    const teacher = await User.findOne({ role: 'teacher' }).select('_id role name email');
    const student = await User.findOne({ role: 'student' }).select('_id role name email studentId');
    const course = await Course.findOne({}).select('_id name code');

    if (!admin || !teacher || !student || !course) {
      console.log('⚠️ Missing admin/teacher/student/course. Seed users/courses first.');
      process.exit(1);
    }

    // Ensure there is an upcoming exam event so the "before exam" rule can trigger.
    const examStart = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const existingExam = await CalendarEvent.findOne({ event_type: 'exam', course_id: course._id });
    if (!existingExam) {
      await CalendarEvent.create({
        title: `Midterm Exam - ${course.code || course.name}`,
        event_type: 'exam',
        start_date: examStart,
        end_date: examStart,
        course_id: course._id,
        created_by: admin._id,
      });
      console.log('🗓️ Created exam event for flag demo');
    }

    // Create a burst of manual Present changes (ATTENDANCE_UPDATE)
    const now = Date.now();
    const logs = [];

    for (let i = 0; i < 7; i++) {
      logs.push({
        actorId: teacher._id,
        actorRole: 'teacher',
        action: 'ATTENDANCE_UPDATE',
        entityType: 'Attendance',
        entityId: new mongoose.Types.ObjectId().toString(),
        ipAddress: '127.0.0.1',
        meta: {
          courseId: course._id.toString(),
          lectureId: new mongoose.Types.ObjectId().toString(),
          studentId: student._id.toString(),
          oldStatus: 'absent',
          newStatus: 'present',
          correctionReason: 'Demo correction',
        },
        createdAt: new Date(now - i * 60 * 60 * 1000),
        updatedAt: new Date(now - i * 60 * 60 * 1000),
      });
    }

    // And frequent edits regardless of status.
    for (let i = 0; i < 6; i++) {
      logs.push({
        actorId: admin._id,
        actorRole: 'admin',
        action: 'ATTENDANCE_UPDATE',
        entityType: 'Attendance',
        entityId: new mongoose.Types.ObjectId().toString(),
        ipAddress: '127.0.0.1',
        meta: {
          courseId: course._id.toString(),
          lectureId: new mongoose.Types.ObjectId().toString(),
          studentId: student._id.toString(),
          oldStatus: 'late',
          newStatus: 'absent',
          correctionReason: 'Demo frequent edits',
        },
        createdAt: new Date(now - (i + 8) * 60 * 60 * 1000),
        updatedAt: new Date(now - (i + 8) * 60 * 60 * 1000),
      });
    }

    await AuditLog.insertMany(logs);
    console.log(`✅ Seeded ${logs.length} audit logs`);
    console.log('✨ Done');

    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to seed audit logs:', err);
    process.exit(1);
  }
}

seedAuditLogs();
