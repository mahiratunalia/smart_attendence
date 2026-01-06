import { Router } from 'express';
import { protect, authorize } from '../middleware/auth.js';
import LeaveRequest from '../models/LeaveRequest.js';
import Notification from '../models/Notification.js';
import Course from '../models/Course.js';

const router = Router();

// Create leave request
router.post('/', protect, authorize('student'), async (req, res) => {
  try {
    console.log('📝 Creating leave request:', req.body);
    console.log('👤 User:', req.user);

    const { courseId, fromDate, toDate, reason } = req.body;

    // Validate required fields
    if (!courseId || !fromDate || !toDate || !reason) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // Validate dates
    if (new Date(fromDate) > new Date(toDate)) {
      return res.status(400).json({ 
        success: false, 
        message: 'End date must be after start date' 
      });
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ 
        success: false, 
        message: 'Course not found' 
      });
    }

    const leaveRequest = await LeaveRequest.create({
      student_id: req.user.id,
      course_id: courseId,
      from_date: fromDate,
      to_date: toDate,
      reason: reason,
      status: 'pending'
    });

    await leaveRequest.populate('course_id', 'name code');
    await leaveRequest.populate('student_id', 'name email studentId');

    // Notify teacher
    if (course.teacherId) {
      await Notification.create({
        user_id: course.teacherId,
        title: 'New Leave Request',
        message: `${req.user.name} has requested leave from ${new Date(fromDate).toLocaleDateString()} to ${new Date(toDate).toLocaleDateString()}`,
        type: 'leave',
        priority: 'medium'
      });
    }

    console.log('✅ Leave request created successfully');
    res.status(201).json({ success: true, data: leaveRequest });
  } catch (error) {
    console.error('❌ Error creating leave request:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to create leave request' 
    });
  }
});

// Get leave requests
router.get('/', protect, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'student') {
      query.student_id = req.user.id;
    } else if (req.user.role === 'teacher' || req.user.role === 'admin') {
      // Teachers/Admins can review student leave requests
      // Keeping this broad avoids "missing sync" when course assignments/seeding change.
      query = {};
    }

    const requests = await LeaveRequest.find(query)
      .populate('student_id', 'name email studentId')
      .populate('course_id', 'name code')
      .populate('reviewed_by', 'name email')
      .sort('-createdAt');

    res.json({ success: true, data: requests });
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch leave requests' });
  }
});

// Review leave request
router.patch('/:id/review', protect, authorize('teacher', 'admin'), async (req, res) => {
  try {
    const { status, review_comment } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id);

    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    leaveRequest.status = status;
    leaveRequest.reviewed_by = req.user.id;
    leaveRequest.review_comment = review_comment;
    leaveRequest.reviewed_at = new Date();
    await leaveRequest.save();

    await leaveRequest.populate('student_id', 'name email');
    await leaveRequest.populate('course_id', 'name code');

    const courseName = leaveRequest.course_id?.name || 'your course';
    await Notification.create({
      user_id: leaveRequest.student_id._id,
      title: `Leave Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your leave request for ${courseName} has been ${status}${review_comment ? ': ' + review_comment : ''}`,
      type: 'leave',
      priority: 'high'
    });

    res.json({ success: true, data: leaveRequest });
  } catch (error) {
    console.error('Error reviewing leave request:', error);
    res.status(500).json({ success: false, message: 'Failed to review leave request' });
  }
});

export default router;