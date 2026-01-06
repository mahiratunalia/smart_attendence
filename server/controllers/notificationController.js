import Notification from '../models/Notification.js';
import User from '../models/User.js';

// Get notifications for current user
export const getNotifications = async (req, res) => {
  try {
    const { unread_only } = req.query;
    
    let query = { user_id: req.user.id };
    if (unread_only === 'true') {
      query.is_read = false;
    }

    const notifications = await Notification.find(query)
      .sort('-createdAt')
      .limit(50);

    res.json({ success: true, data: notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

// Mark notification as read
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      { is_read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
};

// Mark all as read
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user_id: req.user.id, is_read: false },
      { is_read: true }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ success: false, message: 'Failed to update notifications' });
  }
};

// Create notification (system/admin use)
export const createNotification = async (req, res) => {
  try {
    const { user_ids, title, message, type, priority, send_email } = req.body;

    const notifications = user_ids.map(userId => ({
      user_id: userId,
      title,
      message,
      type,
      priority,
      send_email
    }));

    const created = await Notification.insertMany(notifications);

    res.status(201).json({ 
      success: true, 
      data: created,
      message: `${created.length} notifications sent`
    });
  } catch (error) {
    console.error('Error creating notifications:', error);
    res.status(500).json({ success: false, message: 'Failed to create notifications' });
  }
};

// Get unread count
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user_id: req.user.id,
      is_read: false
    });

    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ success: false, message: 'Failed to get count' });
  }
};

// Delete notification
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user_id: req.user.id
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, message: 'Failed to delete notification' });
  }
};
