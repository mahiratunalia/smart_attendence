import mongoose from 'mongoose';

const lectureSessionLogSchema = new mongoose.Schema(
  {
    lectureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lecture', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },

    action: { type: String, enum: ['START', 'ROTATE', 'END'], required: true },

    classroomCode: { type: String, default: null },
    codeExpiresAt: { type: Date, default: null },

    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    actorRole: { type: String, required: true },

    ipAddress: { type: String, default: null },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model('LectureSessionLog', lectureSessionLogSchema);