// server/routes/attendance.js
import { Router } from 'express';
import Attendance from '../models/Attendance.js';
import Lecture from '../models/Lecture.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';
import { logAudit } from '../utils/logAudit.js';

const router = Router();

// Mark attendance (Secure)
router.post('/mark', protect, async (req, res) => {
  try {
    const { lectureId, code, qrToken, markedBy } = req.body;
    const studentId = req.user.id;

    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    if (lecture.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Lecture is not active' });
    }

    if (lecture.sessionStartTime) {
      const now = new Date();
      const startTime = new Date(lecture.sessionStartTime);
      const diffMinutes = (now - startTime) / 1000 / 60;
      const window = lecture.attendanceWindowMinutes || 10;

      if (diffMinutes > window) {
        return res.status(400).json({ success: false, message: 'Attendance window has closed' });
      }
    }

    if (markedBy === 'code') {
      if (!lecture.activeClassCode || lecture.activeClassCode !== code) {
        return res.status(400).json({ success: false, message: 'Invalid classroom code' });
      }
    } else if (markedBy === 'qr') {
      if (!lecture.activeQrCode || lecture.activeQrCode !== qrToken) {
        return res.status(400).json({ success: false, message: 'Invalid or expired QR code' });
      }
    }

    const existing = await Attendance.findOne({ lecture_id: lectureId, student_id: studentId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Attendance already marked' });
    }

    const attendance = await Attendance.create({
      lecture_id: lectureId,
      student_id: studentId,
      status: 'present',
      marked_by: markedBy,
      ip_address: req.ip
    });

    await logAudit({
      req,
      action: 'ATTENDANCE_MARK',
      entityType: 'Attendance',
      entityId: attendance._id,
      meta: {
        courseId: lecture.course_id,
        lectureId: lecture._id,
        studentId,
        oldStatus: null,
        newStatus: 'present',
        markedBy,
      },
    });

    res.status(201).json({ success: true, message: 'Attendance marked successfully', data: attendance });

  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark attendance' });
  }
});

// Get attendance records (with filters)
router.get('/', protect, async (req, res) => {
  try {
    const { courseId, studentName, startDate, endDate, lectureId } = req.query;
    let query = {};

    // 1. Role restrictions
    if (req.user.role === 'student') {
      query.student_id = req.user.id;
    }

    // 2. Filter by Student (Name/Email/ID)
    if (studentName) {
      const students = await User.find({
        role: 'student',
        $or: [
          { name: { $regex: studentName, $options: 'i' } },
          { email: { $regex: studentName, $options: 'i' } },
          { studentId: { $regex: studentName, $options: 'i' } }
        ]
      }).select('_id');
      
      const studentIds = students.map(s => s._id);
      
      if (req.user.role === 'student') {
         // If student is searching, ignore filter or ensure it matches self
      } else {
         query.student_id = { $in: studentIds };
      }
    }

    // 3. Filter by Lecture (Course, Date, specific Lecture)
    let lectureQuery = {};
    if (courseId && courseId !== 'all') lectureQuery.course_id = courseId;
    if (lectureId) lectureQuery._id = lectureId;
    
    if (startDate || endDate) {
      lectureQuery.date = {};
      if (startDate) lectureQuery.date.$gte = new Date(startDate);
      if (endDate) lectureQuery.date.$lte = new Date(endDate);
    }

    if (Object.keys(lectureQuery).length > 0) {
      const lectures = await Lecture.find(lectureQuery).select('_id');
      const lectureIds = lectures.map(l => l._id);
      query.lecture_id = { $in: lectureIds };
    }

    const records = await Attendance.find(query)
      .populate({
        path: 'lecture_id',
        populate: { path: 'course_id', select: 'name code' }
      })
      .populate('student_id', 'name email studentId')
      .sort('-createdAt');
      
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('Fetch attendance error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance' });
  }
});

// Update attendance (Correction)
router.put('/:id', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { status, correctionReason } = req.body;
    
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    const oldStatus = attendance.status;

    attendance.status = status;
    if (correctionReason) {
      attendance.correction_reason = correctionReason;
    }
    
    await attendance.save();
    
    await attendance.populate('student_id', 'name email');
    await attendance.populate({
        path: 'lecture_id',
        populate: { path: 'course_id', select: 'name code' }
    });

    await logAudit({
      req,
      action: 'ATTENDANCE_UPDATE',
      entityType: 'Attendance',
      entityId: attendance._id,
      meta: {
        courseId: attendance.lecture_id?.course_id?._id || attendance.lecture_id?.course_id,
        lectureId: attendance.lecture_id?._id,
        studentId: attendance.student_id?._id || attendance.student_id,
        oldStatus,
        newStatus: status,
        correctionReason: correctionReason || undefined,
      },
    });

    res.json({ success: true, message: 'Attendance updated', data: attendance });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({ success: false, message: 'Failed to update attendance' });
  }
});

export default router;