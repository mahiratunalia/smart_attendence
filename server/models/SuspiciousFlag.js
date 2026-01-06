import mongoose from 'mongoose';

const suspiciousFlagSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lectureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lecture' },
  type: { type: String, required: true }, // e.g. "EXPIRED_CODE", "TOO_MANY_ATTEMPTS"
  details: { type: Object, default: {} },
  resolved: { type: Boolean, default: false },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
}, { timestamps: true });

export default mongoose.model('SuspiciousFlag', suspiciousFlagSchema);
