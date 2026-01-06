import Message from '../models/Message.js';
import Course from '../models/Course.js';

export const getMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const messages = await Message.find({
      $or: [{ sender_id: userId }, { recipient_id: userId }]
    })
    .populate('sender_id', 'name email')
    .populate('recipient_id', 'name email')
    .sort('-created_at');

    res.json({ success: true, data: messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { recipientId, courseId, subject, content } = req.body;
    const senderId = req.user.id;

    if (courseId) {
      // Send to all students in the course
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ success: false, message: 'Course not found' });
      }
      
      if (!course.students || course.students.length === 0) {
        return res.status(400).json({ success: false, message: 'No students enrolled in this course' });
      }

      const messages = course.students.map(studentId => ({
        sender_id: senderId,
        recipient_id: studentId,
        subject: `[${course.code}] ${subject}`,
        content,
        is_read: false,
        created_at: new Date()
      }));

      await Message.insertMany(messages);
      
      return res.status(201).json({ success: true, message: `Message sent to ${messages.length} students` });

    } else if (recipientId) {
      // Individual message
      const message = await Message.create({
        sender_id: senderId,
        recipient_id: recipientId,
        subject,
        content
      });

      return res.status(201).json({ success: true, data: message });
    } else {
      return res.status(400).json({ success: false, message: 'Recipient or Course is required' });
    }

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const message = await Message.findOneAndUpdate(
      { _id: req.params.id, recipient_id: req.user.id },
      { is_read: true },
      { new: true }
    );
    res.json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update message' });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    await Message.findOneAndDelete({
      _id: req.params.id,
      $or: [{ sender_id: req.user.id }, { recipient_id: req.user.id }]
    });
    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete message' });
  }
};
