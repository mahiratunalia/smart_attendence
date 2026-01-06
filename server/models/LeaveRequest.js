import mongoose from 'mongoose';

const leaveRequestSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  from_date: {
    type: Date,
    required: true
  },
  to_date: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  review_comment: String,
  reviewed_at: Date,
  supporting_document: String
}, {
  timestamps: true
});

leaveRequestSchema.index({ student_id: 1, status: 1 });
leaveRequestSchema.index({ course_id: 1 });

export default mongoose.model('LeaveRequest', leaveRequestSchema);
