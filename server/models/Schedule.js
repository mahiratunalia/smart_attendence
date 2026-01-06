import mongoose from 'mongoose';

const scheduleSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0,
    max: 6, // 0 = Sunday, 6 = Saturday
  },
  startTime: {
    type: String,
    required: true,
  },
  endTime: {
    type: String,
    required: true,
  },
  room: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

export default mongoose.model('Schedule', scheduleSchema);

