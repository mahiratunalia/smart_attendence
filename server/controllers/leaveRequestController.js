import LeaveRequest from '../models/LeaveRequest.js';
import Notification from '../models/Notification.js';
import Course from '../models/Course.js';

// Create leave request
export const createLeaveRequest = async (req, res) => {
  try {
    const { course_id, from_date, to_date, reason } = req.body;

    // Validate dates
    if (new Date(from_date) > new Date(to_date)) {
      return res.status(400).json({ 
        success: false, 
        message: 'End date must be after start date' 
      });
    }

    const leaveRequest = await LeaveRequest.create({
      student_id: req.user.id,
      course_id,
      from_date,
      to_date,
      reason,
      status: 'pending'
    });

    await leaveRequest.populate('course_id', 'name code');
    await leaveRequest.populate('student_id', 'name email studentId');

    // Notify teacher
    const course = await Course.findById(course_id);
    if (course) {
      await Notification.create({
        user_id: course.teacherId,
        title: 'New Leave Request',
        message: `${req.user.name} has requested leave from ${new Date(from_date).toLocaleDateString()} to ${new Date(to_date).toLocaleDateString()}`,
        type: 'leave',
        priority: 'medium'
      });
    }

    res.status(201).json({ success: true, data: leaveRequest });
  } catch (error) {
    console.error('Error creating leave request:', error);
    res.status(500).json({ success: false, message: 'Failed to create leave request' });
  }
};

// Get leave requests
export const getLeaveRequests = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'student') {
      query.student_id = req.user.id;
    } else if (req.user.role === 'teacher') {
      // Get courses taught by this teacher
      const courses = await Course.find({ teacherId: req.user.id }).select('_id');
      const courseIds = courses.map(c => c._id);
      query.course_id = { $in: courseIds };
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
};

// Review leave request (approve/reject)
export const reviewLeaveRequest = async (req, res) => {
  try {
    const { status, review_comment } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate('student_id', 'name email')
      .populate('course_id', 'name code');

    if (!leaveRequest) {
      return res.status(404).json({ success: false, message: 'Leave request not found' });
    }

    // Verify teacher has access
    const course = await Course.findById(leaveRequest.course_id._id);
    if (course.teacherId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    leaveRequest.status = status;
    leaveRequest.reviewed_by = req.user.id;
    leaveRequest.review_comment = review_comment;
    leaveRequest.reviewed_at = new Date();
    await leaveRequest.save();

    // Notify student
    await Notification.create({
      user_id: leaveRequest.student_id._id,
      title: `Leave Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your leave request for ${leaveRequest.course_id.name} has been ${status}${review_comment ? ': ' + review_comment : ''}`,
      type: 'leave',
      priority: 'high'
    });

    res.json({ success: true, data: leaveRequest });
  } catch (error) {
    console.error('Error reviewing leave request:', error);
    res.status(500).json({ success: false, message: 'Failed to review leave request' });
  }
};
