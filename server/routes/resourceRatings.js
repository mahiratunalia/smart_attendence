import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import mongoose from 'mongoose';
import ResourceRating from '../models/ResourceRating.js';

const router = Router();

router.post('/:resourceId', protect, async (req, res) => {
  try {
    const { resourceId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
      return res.status(400).json({ success: false, message: 'Invalid resource id' });
    }

    const rating = Number(req.body.rating ?? req.body.stars);
    const comment = req.body.comment;
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    await ResourceRating.findOneAndUpdate(
      { resourceId, userId: req.user.id },
      { $set: { stars: rating, comment } },
      { upsert: true, new: true, runValidators: true }
    );

    const summary = await ResourceRating.aggregate([
      { $match: { resourceId: new mongoose.Types.ObjectId(resourceId) } },
      {
        $group: {
          _id: '$resourceId',
          average_rating: { $avg: '$stars' },
          rating_count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      message: 'Rating submitted',
      data: {
        average_rating: summary[0]?.average_rating ?? 0,
        rating_count: summary[0]?.rating_count ?? 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to submit rating' });
  }
});

router.get('/:resourceId', protect, async (req, res) => {
  try {
    const { resourceId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
      return res.status(400).json({ success: false, message: 'Invalid resource id' });
    }

    const ratings = await ResourceRating.find({ resourceId })
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: ratings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch ratings' });
  }
});

export default router;