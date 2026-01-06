import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
  },
  description: {
    type: String,
  },
  credits: {
    type: Number,
    default: 3,
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  },
  semester: {
    type: String,
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
}, {
  timestamps: true,
});

export default mongoose.model('Course', courseSchema);

