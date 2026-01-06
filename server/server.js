import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import courseRoutes from './routes/courses.js';
import lectureRoutes from './routes/lectures.js';
import attendanceRoutes from './routes/attendance.js';
import resourceRoutes from './routes/resources.js';
import messageRoutes from './routes/messages.js';
import notificationRoutes from './routes/notifications.js';
import scheduleRoutes from './routes/schedules.js';
import departmentRoutes from './routes/departments.js';
import analyticsRoutes from './routes/analytics.js';
import leaveRoutes from './routes/leaveRequests.js';
import auditRoutes from './routes/audit.js';
import resourceRatingsRoutes from './routes/resourceRatings.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory');
}

// Middleware - CORS must be configured before routes
app.use(cors({
  origin: true, // Allow all origins for debugging
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files - IMPORTANT: This must come before other routes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
console.log('📂 Serving uploads from:', path.join(__dirname, 'uploads'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-system')
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/lectures', lectureRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/leave-requests', leaveRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/resource-ratings', resourceRatingsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Test route to list uploads
app.get('/api/uploads/list', (req, res) => {
  try {
    const files = fs.readdirSync(uploadsDir);
    res.json({ success: true, files, path: uploadsDir });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Accepting connections from all sources`);
});

