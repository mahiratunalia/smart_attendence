import mongoose from 'mongoose';

const calendarEventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  event_type: {
    type: String,
    enum: ['lecture', 'exam', 'assignment', 'holiday', 'other'],
    required: true
  },
  start_date: {
    type: Date,
    required: true
  },
  end_date: {
    type: Date
  },
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  lecture_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lecture'
  },
  resource_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resource'
  },
  location: String,
  color: String,
  all_day: {
    type: Boolean,
    default: false
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

calendarEventSchema.index({ start_date: 1, end_date: 1 });
calendarEventSchema.index({ course_id: 1 });

export default mongoose.model('CalendarEvent', calendarEventSchema);
