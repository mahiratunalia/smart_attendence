import Course from '../models/Course.js';
import User from '../models/User.js';

class CourseService {
  async getCourses(user) {
    let query = {};
    
    if (user.role === 'teacher') {
      query.teacherId = user.id;
    } else if (user.role === 'student') {
      query.students = user.id;
    }

    return await Course.find(query)
      .populate('teacherId', 'name email')
      .populate('students', 'name email studentId');
  }

  async getCourseById(courseId) {
    const course = await Course.findById(courseId)
      .populate('teacherId', 'name email')
      .populate('students', 'name email studentId');
    
    if (!course) {
      throw new Error('Course not found');
    }
    
    return course;
  }

  async createCourse(courseData, teacherId) {
    const course = await Course.create({
      ...courseData,
      teacherId
    });
    
    return await course.populate('teacherId', 'name email');
  }

  async updateCourse(courseId, updateData) {
    const course = await Course.findByIdAndUpdate(
      courseId,
      updateData,
      { new: true, runValidators: true }
    ).populate('teacherId', 'name email');

    if (!course) {
      throw new Error('Course not found');
    }

    return course;
  }

  async deleteCourse(courseId) {
    const course = await Course.findByIdAndDelete(courseId);
    if (!course) {
      throw new Error('Course not found');
    }
    return course;
  }

  async enrollStudent(courseId, studentId) {
    const course = await Course.findById(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      throw new Error('Invalid student');
    }

    if (course.students.includes(studentId)) {
      throw new Error('Student already enrolled');
    }

    course.students.push(studentId);
    await course.save();

    return { success: true, message: 'Student enrolled successfully' };
  }
}

export default new CourseService();
