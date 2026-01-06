import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import CalendarEvent from '../models/CalendarEvent.js';

const router = Router();

/**
 * GET /api/audit/logs
 * Admin-only
 */
router.get('/logs', protect, authorize('admin'), async (req, res) => {
  try {
    const {
      userId,
      studentId,
      courseId,
      action,
      startDate,
      endDate,
      limit,
    } = req.query;

    const query = {};
    const and = [];

    if (userId) query.actorId = userId;

    if (studentId) {
      and.push({
        $or: [
          { 'meta.studentId': String(studentId) },
          { 'meta.student_id': String(studentId) },
        ],
      });
    }

    if (action) {
      query.action = { $regex: String(action), $options: 'i' };
    }

    if (courseId) {
      and.push({
        $or: [
          { 'meta.courseId': String(courseId) },
          { 'meta.course_id': String(courseId) },
        ],
      });
    }

    if (and.length) query.$and = and;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(String(startDate));
      if (endDate) {
        const d = new Date(String(endDate));
        // include the whole day if date-only
        if (!String(endDate).includes('T')) {
          d.setHours(23, 59, 59, 999);
        }
        query.createdAt.$lte = d;
      }
    }

    const take = Math.min(Math.max(parseInt(String(limit || '200'), 10) || 200, 1), 1000);

    const logs = await AuditLog.find(query)
      .populate('actorId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(take);

    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
});

/**
 * GET /api/audit/flags
 * Admin-only
 * Detect suspicious patterns from audit logs.
 */
router.get('/flags', protect, authorize('admin'), async (req, res) => {
  try {
    const windowDays = Math.min(Math.max(parseInt(String(req.query.windowDays || '7'), 10) || 7, 1), 90);
    const frequentEditsThreshold = Math.min(Math.max(parseInt(String(req.query.frequentEditsThreshold || '6'), 10) || 6, 2), 100);
    const presentChangesThreshold = Math.min(Math.max(parseInt(String(req.query.presentChangesThreshold || '5'), 10) || 5, 2), 100);
    const beforeExamHours = Math.min(Math.max(parseInt(String(req.query.beforeExamHours || '48'), 10) || 48, 1), 168);
    const beforeExamThreshold = Math.min(Math.max(parseInt(String(req.query.beforeExamThreshold || '5'), 10) || 5, 2), 200);

    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    const baseMatch = {
      action: 'ATTENDANCE_UPDATE',
      createdAt: { $gte: since },
    };

    const studentIdExpr = { $ifNull: ['$meta.studentId', '$meta.student_id'] };
    const courseIdExpr = { $ifNull: ['$meta.courseId', '$meta.course_id'] };

    const [frequentEdits, manyPresentChanges] = await Promise.all([
      AuditLog.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: { studentId: studentIdExpr, courseId: courseIdExpr },
            count: { $sum: 1 },
            firstSeen: { $min: '$createdAt' },
            lastSeen: { $max: '$createdAt' },
          },
        },
        { $match: { count: { $gte: frequentEditsThreshold } } },
        { $sort: { count: -1, lastSeen: -1 } },
        { $limit: 200 },
      ]),

      AuditLog.aggregate([
        {
          $match: {
            ...baseMatch,
            'meta.newStatus': 'present',
            'meta.oldStatus': { $ne: 'present' },
          },
        },
        {
          $group: {
            _id: { studentId: studentIdExpr, courseId: courseIdExpr },
            count: { $sum: 1 },
            firstSeen: { $min: '$createdAt' },
            lastSeen: { $max: '$createdAt' },
          },
        },
        { $match: { count: { $gte: presentChangesThreshold } } },
        { $sort: { count: -1, lastSeen: -1 } },
        { $limit: 200 },
      ]),
    ]);

    // Exam proximity rule (only if exam events exist)
    const examSince = since;
    const examUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const exams = await CalendarEvent.find({
      event_type: 'exam',
      start_date: { $gte: examSince, $lte: examUntil },
      course_id: { $ne: null },
    }).select('_id course_id start_date title');

    const beforeExamFlags = [];
    if (exams.length) {
      // Build per-course exam windows.
      const courseWindows = new Map();
      for (const ev of exams) {
        const courseId = String(ev.course_id);
        const end = new Date(ev.start_date);
        const start = new Date(end.getTime() - beforeExamHours * 60 * 60 * 1000);
        const prev = courseWindows.get(courseId);
        // Keep the earliest start and latest end for the course.
        if (!prev) courseWindows.set(courseId, { start, end, titles: [ev.title] });
        else {
          courseWindows.set(courseId, {
            start: prev.start < start ? prev.start : start,
            end: prev.end > end ? prev.end : end,
            titles: [...prev.titles, ev.title],
          });
        }
      }

      // Query per course; keep it simple and bounded.
      for (const [courseId, w] of courseWindows.entries()) {
        const agg = await AuditLog.aggregate([
          {
            $match: {
              action: 'ATTENDANCE_UPDATE',
              createdAt: { $gte: w.start, $lte: w.end },
              'meta.newStatus': 'present',
              'meta.oldStatus': { $ne: 'present' },
              $or: [{ 'meta.courseId': courseId }, { 'meta.course_id': courseId }],
            },
          },
          {
            $group: {
              _id: { studentId: studentIdExpr, courseId: courseIdExpr },
              count: { $sum: 1 },
              firstSeen: { $min: '$createdAt' },
              lastSeen: { $max: '$createdAt' },
            },
          },
          { $match: { count: { $gte: beforeExamThreshold } } },
          { $sort: { count: -1, lastSeen: -1 } },
          { $limit: 200 },
        ]);

        for (const row of agg) {
          beforeExamFlags.push({
            ...row,
            _exam: {
              courseId,
              windowStart: w.start,
              windowEnd: w.end,
              titles: w.titles.slice(0, 5),
            },
          });
        }
      }
    }

    const allKeys = new Set();
    const pushKeys = (arr) => {
      for (const r of arr) {
        if (r?._id?.studentId) allKeys.add(String(r._id.studentId));
        if (r?._id?.courseId) allKeys.add(String(r._id.courseId));
      }
    };
    pushKeys(frequentEdits);
    pushKeys(manyPresentChanges);
    pushKeys(beforeExamFlags);

    const ids = Array.from(allKeys);
    const [users, courses] = await Promise.all([
      User.find({ _id: { $in: ids } }).select('name email role studentId').lean(),
      Course.find({ _id: { $in: ids } }).select('name code').lean(),
    ]);
    const userMap = new Map(users.map(u => [String(u._id), u]));
    const courseMap = new Map(courses.map(c => [String(c._id), c]));

    const makeFlag = ({ rule, severity, row, extra }) => {
      const student = row?._id?.studentId ? userMap.get(String(row._id.studentId)) : undefined;
      const course = row?._id?.courseId ? courseMap.get(String(row._id.courseId)) : undefined;
      return {
        id: `${rule}:${String(row?._id?.studentId || 'none')}:${String(row?._id?.courseId || 'none')}`,
        rule,
        severity,
        count: row.count,
        firstSeen: row.firstSeen,
        lastSeen: row.lastSeen,
        student: student
          ? { _id: String(student._id), name: student.name, email: student.email, studentId: student.studentId }
          : row?._id?.studentId
            ? { _id: String(row._id.studentId) }
            : undefined,
        course: course
          ? { _id: String(course._id), name: course.name, code: course.code }
          : row?._id?.courseId
            ? { _id: String(row._id.courseId) }
            : undefined,
        recommendedFilters: {
          courseId: row?._id?.courseId ? String(row._id.courseId) : undefined,
          studentId: row?._id?.studentId ? String(row._id.studentId) : undefined,
          action: 'ATTENDANCE_UPDATE',
          startDate: row.firstSeen,
          endDate: row.lastSeen,
        },
        ...extra,
      };
    };

    const flags = [];
    for (const row of beforeExamFlags) {
      flags.push(makeFlag({
        rule: 'MANY_PRESENT_CHANGES_BEFORE_EXAM',
        severity: 'high',
        row,
        extra: {
          examContext: row._exam,
          title: 'Many manual Present changes near exam',
        },
      }));
    }
    for (const row of manyPresentChanges) {
      flags.push(makeFlag({
        rule: 'MANY_MANUAL_PRESENT_CHANGES',
        severity: 'medium',
        row,
        extra: { title: 'Many manual Present changes' },
      }));
    }
    for (const row of frequentEdits) {
      flags.push(makeFlag({
        rule: 'FREQUENT_ATTENDANCE_EDITS_SAME_STUDENT',
        severity: 'medium',
        row,
        extra: { title: 'Frequent attendance edits for same student' },
      }));
    }

    // Sort by severity then count.
    const sevRank = { high: 2, medium: 1, low: 0 };
    flags.sort((a, b) => {
      const s = (sevRank[b.severity] || 0) - (sevRank[a.severity] || 0);
      if (s !== 0) return s;
      return (b.count || 0) - (a.count || 0);
    });

    res.json({ success: true, data: flags });
  } catch (error) {
    console.error('Failed to compute audit flags:', error);
    res.status(500).json({ success: false, message: 'Failed to compute audit flags' });
  }
});

export default router;