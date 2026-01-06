import mongoose from 'mongoose';

const parentStudentLinkSchema = new mongoose.Schema({
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

// Ensure one link per parent-student pair
parentStudentLinkSchema.index({ parentId: 1, studentId: 1 }, { unique: true });

export default mongoose.model('ParentStudentLink', parentStudentLinkSchema);

