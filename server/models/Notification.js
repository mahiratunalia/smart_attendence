import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['lecture', 'assignment', 'resource', 'announcement', 'leave', 'general'],
    default: 'general'
  },
  related_to: {
    type: {
      type: String,
      enum: ['lecture', 'course', 'resource', 'leave']
    },
    id: mongoose.Schema.Types.ObjectId
  },
  is_read: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  send_email: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

notificationSchema.index({ user_id: 1, is_read: 1 });
notificationSchema.index({ created_at: -1 });

export default mongoose.model('Notification', notificationSchema);

