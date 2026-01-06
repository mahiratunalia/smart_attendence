import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorRole: { type: String },
  action: { type: String, required: true }, // e.g. "LECTURE_SESSION_START"
  entityType: { type: String }, // "Lecture", "AttendanceRecord", ...
  entityId: { type: String },
  meta: { type: Object, default: {} },
  ipAddress: { type: String },
}, { timestamps: true });

export default mongoose.model('AuditLog', auditLogSchema);
