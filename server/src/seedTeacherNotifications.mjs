import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String,
});

const notificationSchema = new mongoose.Schema(
  {
    user_id: mongoose.Schema.Types.ObjectId,
    title: String,
    message: String,
    type: String,
    is_read: Boolean,
    priority: String,
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);
const Notification = mongoose.model('Notification', notificationSchema);

async function seedTeacherNotifications() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-system');
    console.log('✅ Connected');

    const teachers = await User.find({ role: 'teacher' });
    const students = await User.find({ role: 'student' });

    if (teachers.length === 0) {
      console.log('❌ No teachers found. Run seed:users first.');
      process.exit(1);
    }

    const fatima = students.find(s => (s.email || '').includes('fatima')) || students[0];

    const now = Date.now();

    const notifications = [];
    for (const teacher of teachers) {
      notifications.push(
        {
          user_id: teacher._id,
          title: 'New Leave Request Submitted',
          message: `${fatima?.name || 'A student'} submitted a leave request. Review it from Leave Requests.`,
          type: 'leave',
          priority: 'high',
          is_read: false,
          createdAt: new Date(now - 1000 * 60 * 10),
          updatedAt: new Date(now - 1000 * 60 * 10),
        },
        {
          user_id: teacher._id,
          title: 'New Resource Uploaded to Your Course',
          message: 'A student uploaded a resource for one of your courses. Check the Resources tab to review it.',
          type: 'resource',
          priority: 'medium',
          is_read: false,
          createdAt: new Date(now - 1000 * 60 * 60),
          updatedAt: new Date(now - 1000 * 60 * 60),
        },
        {
          user_id: teacher._id,
          title: 'Lecture Starting Soon',
          message: 'Your next lecture is scheduled soon. You can start the session and generate codes from Lectures.',
          type: 'lecture',
          priority: 'medium',
          is_read: true,
          createdAt: new Date(now - 1000 * 60 * 60 * 3),
          updatedAt: new Date(now - 1000 * 60 * 60 * 3),
        }
      );
    }

    for (const student of students.slice(0, 8)) {
      notifications.push(
        {
          user_id: student._id,
          title: 'New Assignment Posted',
          message: 'A new assignment has been posted in one of your courses. Check Assignments for details.',
          type: 'assignment',
          priority: 'medium',
          is_read: false,
          createdAt: new Date(now - 1000 * 60 * 15),
          updatedAt: new Date(now - 1000 * 60 * 15),
        },
        {
          user_id: student._id,
          title: 'Attendance Marked Successfully',
          message: 'Your attendance was recorded for today’s lecture session.',
          type: 'lecture',
          priority: 'low',
          is_read: true,
          createdAt: new Date(now - 1000 * 60 * 60 * 2),
          updatedAt: new Date(now - 1000 * 60 * 60 * 2),
        }
      );
    }

    console.log(`🧹 Clearing existing notifications for seeded users...`);
    await Notification.deleteMany({
      user_id: { $in: [...teachers.map(t => t._id), ...students.map(s => s._id)] },
    });

    console.log(`📝 Creating ${notifications.length} notifications (teachers + students)...`);
    await Notification.insertMany(notifications);

    console.log('✅ Done');
    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e);
    process.exit(1);
  }
}

seedTeacherNotifications();
