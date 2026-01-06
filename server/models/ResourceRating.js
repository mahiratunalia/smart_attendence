import mongoose from 'mongoose';

const resourceRatingSchema = new mongoose.Schema({
  resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  stars: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String },
}, { timestamps: true });

resourceRatingSchema.index({ resourceId: 1, userId: 1 }, { unique: true });

export default mongoose.model('ResourceRating', resourceRatingSchema);
