import mongoose from 'mongoose';

const lectureSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  location: {
    type: String
  },
  status: {
    type: String,
    enum: ['scheduled', 'active', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  attendanceWindowMinutes: {
    type: Number,
    default: 10
  },
  sessionStartTime: {
    type: Date
  },
  activeQrCode: {
    type: String
  },
  activeClassCode: {
    type: String
  },
  qrCode: {
    type: String
  },
  classroomCode: {
    type: String
  }
}, {
  timestamps: true
});

export default mongoose.model('Lecture', lectureSchema);
