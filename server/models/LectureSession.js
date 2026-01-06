import mongoose from 'mongoose';

const lectureSessionSchema = new mongoose.Schema({
  lecture_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lecture',
    required: true
  },
  classroom_code: {
    type: String,
    required: true
  },
  qr_token: {
    type: String,
    required: true
  },
  code_generated_at: {
    type: Date,
    default: Date.now
  },
  qr_generated_at: {
    type: Date,
    default: Date.now
  },
  is_active: {
    type: Boolean,
    default: true
  },
  started_at: {
    type: Date,
    default: Date.now
  },
  attendance_window_minutes: {
    type: Number,
    default: 10
  }
}, {
  timestamps: true
});

// Index for quick lookups
lectureSessionSchema.index({ lecture_id: 1, is_active: 1 });
lectureSessionSchema.index({ classroom_code: 1 });

export default mongoose.model('LectureSession', lectureSessionSchema);
