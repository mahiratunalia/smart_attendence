import mongoose from 'mongoose';

const attendanceRecordSchema = new mongoose.Schema({
  lectureId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lecture',
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'excused'],
    required: true,
  },
  markedAt: { type: Date, default: Date.now },
  markedBy: {
    type: String,
    enum: ['qr', 'code', 'manual'],
    required: true,
  },
  ipAddress: { type: String },

  // manual edit tracking
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  correctionReason: { type: String },
}, { timestamps: true });

attendanceRecordSchema.index({ lectureId: 1, studentId: 1 }, { unique: true });

export default mongoose.model('AttendanceRecord', attendanceRecordSchema);
