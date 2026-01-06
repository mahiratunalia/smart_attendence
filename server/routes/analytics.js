import { Router } from 'express';
import { protect } from '../middleware/auth.js';

const router = Router();

router.get('/dashboard', protect, async (req, res) => {
  try {
    res.json({ success: true, data: { message: 'Analytics coming soon' } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

export default router;

