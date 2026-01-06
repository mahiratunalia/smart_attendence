import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import {
  getMessages,
  sendMessage,
  markAsRead,
  deleteMessage
} from '../controllers/messageController.js';

const router = Router();

// Get messages
router.get('/', protect, getMessages);

// Send message
router.post('/', protect, sendMessage);

// Mark message as read
router.put('/:id/read', protect, markAsRead);

// Delete message
router.delete('/:id', protect, deleteMessage);

export default router;