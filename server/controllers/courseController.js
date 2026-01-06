import courseService from '../services/courseService.js';

export const getAllCourses = async (req, res) => {
  try {
    const courses = await courseService.getCourses(req.user);
    res.json({ success: true, data: courses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCourseById = async (req, res) => {
  try {
    const course = await courseService.getCourseById(req.params.id);
    res.json({ success: true, data: course });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

export const createCourse = async (req, res) => {
  try {
    const course = await courseService.createCourse(req.body, req.user.id);
    res.status(201).json({ success: true, data: course });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateCourse = async (req, res) => {
  try {
    const course = await courseService.updateCourse(req.params.id, req.body);
    res.json({ success: true, data: course });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteCourse = async (req, res) => {
  try {
    await courseService.deleteCourse(req.params.id);
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const enrollStudent = async (req, res) => {
  try {
    const result = await courseService.enrollStudent(req.params.id, req.body.studentId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
