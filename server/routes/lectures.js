import { Router } from 'express';
import Lecture from '../models/Lecture.js';
import Course from '../models/Course.js';
import { protect, authorize } from '../middleware/auth.js';
import { logAudit } from '../utils/logAudit.js';

const router = Router();

// Get all lectures
router.get('/', protect, async (req, res) => {
  try {
    console.log('📋 Fetching lectures...');
    
    const lectures = await Lecture.find()
      .populate('course_id', 'name code teacherId')
      .sort({ date: 1, startTime: 1 });
    
    console.log(`✅ Found ${lectures.length} lectures`);
    res.json({ success: true, data: lectures });
  } catch (error) {
    console.error('❌ Error fetching lectures:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch lectures' });
  }
});

// Get single lecture
router.get('/:id', protect, async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id)
      .populate('course_id', 'name code');
    
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }
    
    res.json({ success: true, data: lecture });
  } catch (error) {
    console.error('Error fetching lecture:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch lecture' });
  }
});

// Create lecture
router.post('/', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const lecture = await Lecture.create(req.body);
    await lecture.populate('course_id', 'name code');

    await logAudit({
      req,
      action: 'LECTURE_CREATE',
      entityType: 'Lecture',
      entityId: lecture._id,
      meta: {
        courseId: lecture.course_id,
        title: lecture.title,
      },
    });
    
    console.log('✅ Lecture created successfully');
    res.status(201).json({ success: true, data: lecture });
  } catch (error) {
    console.error('❌ Error creating lecture:', error);
    res.status(400).json({ success: false, message: 'Failed to create lecture' });
  }
});

// Update lecture
router.put('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    if (req.user.role === 'teacher') {
      const existing = await Lecture.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Lecture not found' });
      }
      const course = await Course.findById(existing.course_id).select('teacherId');
      if (!course || String(course.teacherId) !== String(req.user.id)) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }
    }

    const lecture = await Lecture.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('course_id', 'name code');

    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    await logAudit({
      req,
      action: 'LECTURE_UPDATE',
      entityType: 'Lecture',
      entityId: lecture._id,
      meta: {
        courseId: lecture.course_id?._id || lecture.course_id,
      },
    });

    res.json({ success: true, data: lecture });
  } catch (error) {
    console.error('Error updating lecture:', error);
    res.status(400).json({ success: false, message: 'Failed to update lecture' });
  }
});

// Delete lecture
router.delete('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const lecture = await Lecture.findByIdAndDelete(req.params.id);
    
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    await logAudit({
      req,
      action: 'LECTURE_DELETE',
      entityType: 'Lecture',
      entityId: lecture._id,
      meta: {
        courseId: lecture.course_id,
      },
    });
    
    res.json({ success: true, message: 'Lecture deleted successfully' });
  } catch (error) {
    console.error('Error deleting lecture:', error);
    res.status(400).json({ success: false, message: 'Failed to delete lecture' });
  }
});

// Start Session
router.post('/:id/session/start', protect, authorize('teacher'), async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) return res.status(404).json({ success: false, message: 'Lecture not found' });

    lecture.status = 'active';
    lecture.sessionStartTime = new Date();
    await lecture.save();

    await logAudit({
      req,
      action: 'LECTURE_SESSION_START',
      entityType: 'Lecture',
      entityId: lecture._id,
      meta: { courseId: lecture.course_id },
    });

    res.json({ success: true, data: lecture });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to start session' });
  }
});

// Update Codes
router.put('/:id/session/codes', protect, authorize('teacher'), async (req, res) => {
  try {
    const { qrCode, classroomCode } = req.body;
    const lecture = await Lecture.findById(req.params.id);
    
    if (!lecture) return res.status(404).json({ success: false, message: 'Lecture not found' });

    if (qrCode) lecture.activeQrCode = qrCode;
    if (classroomCode) lecture.activeClassCode = classroomCode;
    
    await lecture.save();

    await logAudit({
      req,
      action: 'LECTURE_SESSION_CODES_UPDATE',
      entityType: 'Lecture',
      entityId: lecture._id,
      meta: { courseId: lecture.course_id },
    });

    res.json({ success: true, data: lecture });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update codes' });
  }
});

// End Session
router.post('/:id/session/end', protect, authorize('teacher'), async (req, res) => {
  try {
    const lecture = await Lecture.findById(req.params.id);
    if (!lecture) return res.status(404).json({ success: false, message: 'Lecture not found' });

    lecture.status = 'completed';
    // Clear active codes
    lecture.activeQrCode = undefined;
    lecture.activeClassCode = undefined;
    await lecture.save();

    await logAudit({
      req,
      action: 'LECTURE_SESSION_END',
      entityType: 'Lecture',
      entityId: lecture._id,
      meta: { courseId: lecture.course_id },
    });

    res.json({ success: true, data: lecture });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to end session' });
  }
});

export default router;
