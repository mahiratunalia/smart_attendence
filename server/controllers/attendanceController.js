import Attendance from '../models/Attendance.js';
import Lecture from '../models/Lecture.js';
import LectureSession from '../models/LectureSession.js';
import attendanceService from '../services/attendanceService.js';

// Generate random 4-digit code
const generateClassroomCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Generate random token for QR
const generateQRToken = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Start lecture session with dynamic codes
export const startLectureSession = async (req, res) => {
  try {
    const { lectureId, attendanceWindowMinutes = 10 } = req.body;

    // Verify lecture exists
    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    // Check if session already active
    const existingSession = await LectureSession.findOne({ 
      lecture_id: lectureId, 
      is_active: true 
    });

    if (existingSession) {
      return res.status(400).json({ 
        success: false, 
        message: 'Lecture session already active' 
      });
    }

    // Create new session with codes
    const session = await LectureSession.create({
      lecture_id: lectureId,
      classroom_code: generateClassroomCode(),
      qr_token: generateQRToken(),
      attendance_window_minutes: attendanceWindowMinutes,
      started_at: new Date()
    });

    console.log('✅ Lecture session started:', session.classroom_code);
    res.status(201).json({ success: true, data: session });
  } catch (error) {
    console.error('❌ Error starting lecture session:', error);
    res.status(500).json({ success: false, message: 'Failed to start lecture session' });
  }
};

// Rotate classroom code (every 2 minutes)
export const rotateClassroomCode = async (req, res) => {
  try {
    const { lectureId } = req.params;

    const session = await LectureSession.findOne({ 
      lecture_id: lectureId, 
      is_active: true 
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'No active session found' });
    }

    session.classroom_code = generateClassroomCode();
    session.code_generated_at = new Date();
    await session.save();

    console.log('🔄 Classroom code rotated:', session.classroom_code);
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('❌ Error rotating code:', error);
    res.status(500).json({ success: false, message: 'Failed to rotate code' });
  }
};

// Rotate QR token (every 30 seconds)
export const rotateQRToken = async (req, res) => {
  try {
    const { lectureId } = req.params;

    const session = await LectureSession.findOne({ 
      lecture_id: lectureId, 
      is_active: true 
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'No active session found' });
    }

    session.qr_token = generateQRToken();
    session.qr_generated_at = new Date();
    await session.save();

    console.log('🔄 QR token rotated');
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('❌ Error rotating QR:', error);
    res.status(500).json({ success: false, message: 'Failed to rotate QR' });
  }
};

// Mark attendance with all security checks
export const markAttendance = async (req, res) => {
  try {
    const { lectureId, code, qrToken, markedBy } = req.body;
    const studentId = req.user.id;
    const ipAddress = req.ip;

    console.log('📝 Attendance attempt:', { lectureId, studentId, markedBy });

    // 1. Check if lecture exists
    const lecture = await Lecture.findById(lectureId).populate('course_id');
    if (!lecture) {
      return res.status(404).json({ success: false, message: 'Lecture not found' });
    }

    // 2. Check if student already marked attendance (One-time per lecture)
    const existingAttendance = await Attendance.findOne({ 
      lecture_id: lectureId, 
      student_id: studentId 
    });

    if (existingAttendance) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already marked attendance for this lecture' 
      });
    }

    // 3. Get active session
    const session = await LectureSession.findOne({ 
      lecture_id: lectureId, 
      is_active: true 
    });

    if (!session) {
      return res.status(400).json({ 
        success: false, 
        message: 'No active attendance session for this lecture' 
      });
    }

    // 4. Check time window (10 minutes from start)
    const lectureStartTime = new Date(lecture.date + ' ' + lecture.startTime);
    const currentTime = new Date();
    const timeDiffMinutes = (currentTime - lectureStartTime) / (1000 * 60);

    if (timeDiffMinutes < 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Lecture has not started yet' 
      });
    }

    if (timeDiffMinutes > session.attendance_window_minutes) {
      return res.status(400).json({ 
        success: false, 
        message: `Attendance window closed. You can only mark attendance within the first ${session.attendance_window_minutes} minutes` 
      });
    }

    // 5. Validate code/QR based on method
    if (markedBy === 'code') {
      // Check classroom code validity
      if (code !== session.classroom_code) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid classroom code' 
        });
      }

      // Check if code is still valid (2 minutes)
      const codeAge = (currentTime - session.code_generated_at) / (1000 * 60);
      if (codeAge > 2) {
        return res.status(400).json({ 
          success: false, 
          message: 'Classroom code has expired. Please use the latest code' 
        });
      }
    } else if (markedBy === 'qr') {
      // Check QR token validity
      if (qrToken !== session.qr_token) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid or expired QR code' 
        });
      }

      // Check if QR is still valid (30 seconds)
      const qrAge = (currentTime - session.qr_generated_at) / 1000;
      if (qrAge > 30) {
        return res.status(400).json({ 
          success: false, 
          message: 'QR code has expired. Please scan the latest QR code' 
        });
      }
    }

    // 6. Mark attendance
    const attendance = await Attendance.create({
      lecture_id: lectureId,
      student_id: studentId,
      status: timeDiffMinutes <= 5 ? 'present' : 'late',
      marked_by: markedBy,
      ip_address: ipAddress,
      marked_at: currentTime
    });

    await attendance.populate('student_id', 'name email studentId');

    console.log('✅ Attendance marked successfully');
    res.status(201).json({ 
      success: true, 
      data: attendance,
      message: `Attendance marked as ${attendance.status}` 
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'You have already marked attendance for this lecture' 
      });
    }
    console.error('❌ Error marking attendance:', error);
    res.status(500).json({ success: false, message: 'Failed to mark attendance' });
  }
};

// Get active session for a lecture
export const getLectureSession = async (req, res) => {
  try {
    const { lectureId } = req.params;

    const session = await LectureSession.findOne({ 
      lecture_id: lectureId, 
      is_active: true 
    }).populate('lecture_id');

    if (!session) {
      return res.status(404).json({ 
        success: false, 
        message: 'No active session found' 
      });
    }

    res.json({ success: true, data: session });
  } catch (error) {
    console.error('❌ Error fetching session:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch session' });
  }
};

// End lecture session
export const endLectureSession = async (req, res) => {
  try {
    const { lectureId } = req.params;

    const session = await LectureSession.findOneAndUpdate(
      { lecture_id: lectureId, is_active: true },
      { is_active: false },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ success: false, message: 'No active session found' });
    }

    console.log('🛑 Lecture session ended');
    res.json({ success: true, message: 'Lecture session ended' });
  } catch (error) {
    console.error('❌ Error ending session:', error);
    res.status(500).json({ success: false, message: 'Failed to end session' });
  }
};

// Mark Attendance
export const markAttendanceOld = async (req, res) => {
  try {
    const result = await attendanceService.markAttendance({
      ...req.body,
      studentId: req.user.id,
      ipAddress: req.ip
    });
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get Attendance Records
export const getAttendanceRecordsOld = async (req, res) => {
  try {
    const records = await attendanceService.getAttendanceRecords(req.user);
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Attendance By Lecture
export const getAttendanceByLectureOld = async (req, res) => {
  try {
    const records = await attendanceService.getAttendanceByLecture(req.params.lectureId);
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

// Update Attendance
export const updateAttendanceOld = async (req, res) => {
  try {
    const record = await attendanceService.updateAttendance(req.params.id, req.body);
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
