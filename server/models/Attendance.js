import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  lecture_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lecture',
    required: true
  },
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late'],
    default: 'present'
  },
  marked_by: {
    type: String,
    enum: ['code', 'qr', 'teacher'],
    required: true
  },
  ip_address: String,
  marked_at: {
    type: Date,
    default: Date.now
  },
  correction_reason: String
}, {
  timestamps: true
});

// Compound index to ensure one attendance per student per lecture
attendanceSchema.index({ lecture_id: 1, student_id: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);
