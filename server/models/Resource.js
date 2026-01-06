import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  course_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  type: {
    type: String,
    enum: ['document', 'video', 'link', 'presentation', 'other'],
    default: 'document'
  },
  file_url: {
    type: String
  },
  file_name: {
    type: String
  },
  file_size: {
    type: Number
  },
  uploaded_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  view_count: {
    type: Number,
    default: 0,
    min: 0,
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export default mongoose.model('Resource', resourceSchema);

