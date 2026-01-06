import Attendance from '../models/Attendance.js';
import Lecture from '../models/Lecture.js';

class AttendanceService {
  async markAttendance(data) {
    const { lectureId, studentId, status = 'present', ipAddress } = data;

    // Check if lecture exists
    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      throw new Error('Lecture not found');
    }

    // Check if already marked
    const existing = await Attendance.findOne({ lectureId, studentId });
    if (existing) {
      throw new Error('Attendance already marked for this lecture');
    }

    // Create attendance record
    const attendance = await Attendance.create({
      lectureId,
      studentId,
      status,
      ipAddress,
      markedAt: new Date()
    });

    return {
      success: true,
      data: await attendance.populate('studentId', 'name email studentId')
    };
  }

  async getAttendanceRecords(user) {
    let query = {};

    if (user.role === 'student') {
      query.studentId = user.id;
    }

    return await Attendance.find(query)
      .populate('lectureId', 'title date')
      .populate('studentId', 'name email studentId')
      .sort('-markedAt');
  }

  async getAttendanceByLecture(lectureId) {
    return await Attendance.find({ lectureId })
      .populate('studentId', 'name email studentId')
      .sort('markedAt');
  }

  async updateAttendance(attendanceId, updateData) {
    const attendance = await Attendance.findByIdAndUpdate(
      attendanceId,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    ).populate('studentId', 'name email studentId');

    if (!attendance) {
      throw new Error('Attendance record not found');
    }

    return attendance;
  }
}

export default new AttendanceService();
