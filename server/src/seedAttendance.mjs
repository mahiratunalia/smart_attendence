import mongoose from 'mongoose';
import dotenv from 'dotenv';

import Attendance from '../models/Attendance.js';
import Lecture from '../models/Lecture.js';
import User from '../models/User.js';

dotenv.config();

function pickN(arr, n) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

function combineDateTime(dateObj, timeStr) {
  const date = new Date(dateObj);
  const [hh, mm] = String(timeStr || '09:00').split(':').map((v) => Number(v));
  if (Number.isFinite(hh)) date.setHours(hh);
  if (Number.isFinite(mm)) date.setMinutes(mm);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}

async function seedAttendance() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-system';
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected');

  const students = await User.find({ role: 'student' }).select('_id name email studentId').sort('name');
  if (students.length === 0) {
    console.log('⚠️ No students found. Run seedUsers/seedEnrollments first.');
    process.exit(0);
  }

  const now = new Date();
  const since = new Date(now);
  since.setDate(now.getDate() - 14);

  const lectures = await Lecture.find({ date: { $gte: since, $lte: now } })
    .select('_id date startTime')
    .sort({ date: -1 })
    .limit(12);

  if (lectures.length === 0) {
    console.log('⚠️ No recent lectures found in last 14 days. Nothing to seed.');
    process.exit(0);
  }

  console.log(`👨‍🎓 Students: ${students.length}`);
  console.log(`📚 Lectures (recent): ${lectures.length}`);

  let upserted = 0;
  let skipped = 0;

  for (const lecture of lectures) {
    const chosenStudents = pickN(students, Math.min(6, students.length));

    for (const student of chosenStudents) {
      const statusRand = Math.random();
      const status = statusRand < 0.75 ? 'present' : statusRand < 0.9 ? 'late' : 'absent';
      const markedBy = Math.random() < 0.7 ? 'code' : 'qr';
      const base = combineDateTime(lecture.date, lecture.startTime);
      const markedAt = new Date(base.getTime() + Math.floor(Math.random() * 8) * 60 * 1000); // within 0-7 mins

      const res = await Attendance.updateOne(
        { lecture_id: lecture._id, student_id: student._id },
        {
          $setOnInsert: {
            lecture_id: lecture._id,
            student_id: student._id,
            status,
            marked_by: markedBy,
            ip_address: '127.0.0.1',
            marked_at: markedAt,
          },
        },
        { upsert: true }
      );

      if (res.upsertedCount && res.upsertedCount > 0) upserted += 1;
      else skipped += 1;
    }
  }

  console.log(`✅ Attendance seeded. Added: ${upserted}, skipped(existing): ${skipped}`);
  await mongoose.disconnect();
  process.exit(0);
}

seedAttendance().catch(async (err) => {
  console.error('❌ Seed error:', err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
