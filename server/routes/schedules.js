import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import CalendarEvent from '../models/CalendarEvent.js';
import Lecture from '../models/Lecture.js';
import Attendance from '../models/Attendance.js';

const router = Router();

// Get calendar events
router.get('/', protect, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = {};
    if (start_date && end_date) {
      query.start_date = {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      };
    }

    // Get calendar events
    const events = await CalendarEvent.find(query)
      .populate('course_id', 'name code')
      .populate('lecture_id')
      .sort('start_date');

    res.json({ 
      success: true, 
      data: events
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch schedule' });
  }
});

// Create calendar event
router.post('/', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const event = await CalendarEvent.create({
      ...req.body,
      created_by: req.user.id
    });

    await event.populate('course_id', 'name code');

    res.status(201).json({ success: true, data: event });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ success: false, message: 'Failed to create event' });
  }
});

// Update calendar event
router.put('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const event = await CalendarEvent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('course_id', 'name code');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.json({ success: true, data: event });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ success: false, message: 'Failed to update event' });
  }
});

// Delete calendar event
router.delete('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const event = await CalendarEvent.findByIdAndDelete(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ success: false, message: 'Failed to delete event' });
  }
});

export default router;

