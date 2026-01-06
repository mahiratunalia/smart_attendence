import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Course from '../models/Course.js';
import Lecture from '../models/Lecture.js';
import AttendanceRecord from '../models/AttendanceRecord.js';

const router = express.Router();

/**
 * GET /api/analytics-plus/course/:courseId/attendance-summary
 * Teacher/Admin only
 * Returns per-student totals + percentage across all lectures in that course.
 */
router.get('/course/:courseId/attendance-summary', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId).populate('students', 'name email studentId');
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    if (req.user.role !== 'admin' && course.teacherId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const lectures = await Lecture.find({ courseId }).select('_id date');
    const lectureIds = lectures.map(l => l._id);
    const totalLectures = lectureIds.length;

    if (totalLectures === 0) {
      const empty = (course.students || []).map(s => ({
        studentId: s.studentId,
        name: s.name,
        email: s.email,
        present: 0,
        late: 0,
        excused: 0,
        absent: 0,
        totalLectures: 0,
        attendancePercent: 0,
      }));
      return res.json({ success: true, data: { courseId, totalLectures, rows: empty } });
    }

    const records = await AttendanceRecord.find({ lectureId: { $in: lectureIds } })
      .populate('studentId', 'name email studentId')
      .select('lectureId studentId status');

    const map = new Map();
    for (const s of course.students || []) {
      map.set(String(s._id), {
        studentId: s.studentId,
        name: s.name,
        email: s.email,
        present: 0,
        late: 0,
        excused: 0,
        absent: 0,
        totalLectures,
      });
    }

    for (const r of records) {
      const sid = String(r.studentId?._id || r.studentId);
      if (!map.has(sid)) continue;

      if (r.status === 'present') map.get(sid).present += 1;
      else if (r.status === 'late') map.get(sid).late += 1;
      else if (r.status === 'excused') map.get(sid).excused += 1;
    }

    for (const [_, row] of map) {
      const attended = row.present + row.late + row.excused;
      row.absent = Math.max(0, totalLectures - attended);
      row.attendancePercent = totalLectures ? Math.round((attended / totalLectures) * 100) : 0;
    }

    const rows = Array.from(map.values()).sort((a, b) => b.attendancePercent - a.attendancePercent);

    res.json({ success: true, data: { courseId, totalLectures, rows } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;