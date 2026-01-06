import { Router } from 'express';
import Course from '../models/Course.js';
import User from '../models/User.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// Get all courses
router.get('/', protect, async (req, res) => {
  try {
    let query = {};
    
    // If student, only show enrolled courses
    if (req.user.role === 'student') {
      query.students = req.user.id;
    }
    // If teacher, only show taught courses
    else if (req.user.role === 'teacher') {
      query.teacherId = req.user.id;
    }

    const courses = await Course.find(query)
      .populate('teacherId', 'name email')
      .populate('students', 'name email studentId')
      .sort('code');
      
    res.json({ success: true, data: courses });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch courses' });
  }
});

// Create course
router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const course = await Course.create(req.body);
    res.status(201).json({ success: true, data: course });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Enroll student
router.post('/:id/enroll', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const { studentId } = req.body;
    
    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required' });
    }

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Ensure students array exists
    if (!course.students) {
      course.students = [];
    }

    // Check if student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(400).json({ success: false, message: 'Invalid student ID' });
    }

    // Check if already enrolled (robust check using toString)
    const isEnrolled = course.students.some(id => id.toString() === studentId);
    if (isEnrolled) {
      return res.status(400).json({ success: false, message: 'Student already enrolled' });
    }

    course.students.push(studentId);
    await course.save();

    res.json({ success: true, message: 'Student enrolled successfully', data: course });
  } catch (error) {
    console.error('Error enrolling student:', error);
    res.status(500).json({ success: false, message: 'Failed to enroll student: ' + error.message });
  }
});

// Unenroll student
router.delete('/:id/enroll/:studentId', protect, authorize('admin', 'teacher'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    if (course.students) {
      course.students = course.students.filter(id => id.toString() !== req.params.studentId);
      await course.save();
    }

    res.json({ success: true, message: 'Student unenrolled successfully', data: course });
  } catch (error) {
    console.error('Error unenrolling student:', error);
    res.status(500).json({ success: false, message: 'Failed to unenroll student' });
  }
});

export default router;

