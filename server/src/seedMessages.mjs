import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const messageSchema = new mongoose.Schema({
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  content: { type: String, required: true },
  is_read: { type: Boolean, default: false },
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String
});

const Message = mongoose.model('Message', messageSchema);
const User = mongoose.model('User', userSchema);

async function seedMessages() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-system');
    console.log('✅ Connected to MongoDB');

    const students = await User.find({ role: 'student' });
    const teachers = await User.find({ role: 'teacher' });
    const admin = await User.findOne({ role: 'admin' });

    if (students.length === 0 || teachers.length === 0) {
      console.log('❌ No students or teachers found. Please run seed:users first.');
      process.exit(1);
    }

    console.log('🗑️  Clearing existing messages...');
    await Message.deleteMany({});

    const messages = [];

    // 1. Announcement from Teacher to all students (simulated)
    const teacher = teachers[0];
    const announcementSubject = '[CSE101] Mid-term Exam Schedule';
    const announcementContent = 'Dear students,\n\nThe mid-term exam for Database Systems will be held on Oct 15th at 10:00 AM in Hall A.\n\nPlease prepare accordingly.\n\nBest regards,\nDr. Ahmed';

    students.forEach(student => {
      messages.push({
        sender_id: teacher._id,
        recipient_id: student._id,
        subject: announcementSubject,
        content: announcementContent,
        is_read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2) // 2 days ago
      });
    });

    // 2. Individual message from Teacher to a specific student (Fatima)
    const fatima = students.find(s => s.email.includes('fatima'));
    if (fatima) {
      messages.push({
        sender_id: teacher._id,
        recipient_id: fatima._id,
        subject: 'Regarding your leave request',
        content: 'Hi Fatima,\n\nI have approved your leave request for next week. Please ensure you catch up on the missed lectures.\n\nRegards,\nDr. Ahmed',
        is_read: false,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5) // 5 hours ago
      });
    }

    // 3. Message from Admin to all users (System Announcement)
    const systemSubject = 'System Maintenance';
    const systemContent = 'The system will be down for maintenance on Sunday from 2 AM to 4 AM.';
    
    [...students, ...teachers].forEach(user => {
      messages.push({
        sender_id: admin._id,
        recipient_id: user._id,
        subject: systemSubject,
        content: systemContent,
        is_read: true,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5) // 5 days ago
      });
    });

    console.log(`📝 Creating ${messages.length} messages...`);
    await Message.insertMany(messages);

    console.log('✅ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedMessages();
