import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const teachers = await mongoose.connection.db.collection('users').find({ role: 'teacher' }).toArray();
  console.log('Teachers found:', teachers.length);
  teachers.forEach(t => console.log(' -', t.name, t.email));
  
  const events = await mongoose.connection.db.collection('calendarevents').find({}).toArray();
  console.log('\nCalendar Events found:', events.length);
  events.forEach(e => console.log(' -', e.title, e.event_type, e.created_by ? 'has creator' : 'NO CREATOR'));
  
  await mongoose.disconnect();
}

check();
