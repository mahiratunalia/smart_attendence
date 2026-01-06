import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  createNotification,
  getUnreadCount,
  deleteNotification
} from '../controllers/notificationController.js';

const router = Router();

router.get('/', protect, getNotifications);
router.get('/unread/count', protect, getUnreadCount);
router.put('/:id/read', protect, markAsRead);
router.put('/read-all', protect, markAllAsRead);
router.delete('/:id', protect, deleteNotification);
router.post('/', protect, authorize('teacher', 'admin'), createNotification);

export default router;

