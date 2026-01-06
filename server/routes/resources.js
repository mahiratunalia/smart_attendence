import { Router } from 'express';
import Resource from '../models/Resource.js';
import ResourceRating from '../models/ResourceRating.js';
import { protect } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, name + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, TXT, XLS, XLSX allowed'));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Get all resources
router.get('/', protect, async (req, res) => {
  try {
    console.log('📋 Fetching resources...');
    
    const resources = await Resource.find()
      .populate('course_id', 'name code')
      .populate('uploaded_by', 'name email')
      .sort('-createdAt');

    const resourceIds = resources.map((r) => r._id);
    const ratingSummaries = await ResourceRating.aggregate([
      { $match: { resourceId: { $in: resourceIds } } },
      {
        $group: {
          _id: '$resourceId',
          average_rating: { $avg: '$stars' },
          rating_count: { $sum: 1 },
        },
      },
    ]);
    const byResourceId = new Map(
      ratingSummaries.map((s) => [String(s._id), { average_rating: s.average_rating, rating_count: s.rating_count }])
    );

    const data = resources.map((r) => {
      const obj = r.toObject({ virtuals: true });
      const summary = byResourceId.get(String(r._id));
      obj.average_rating = summary?.average_rating ?? 0;
      obj.rating_count = summary?.rating_count ?? 0;
      return obj;
    });
    
    console.log(`✅ Found ${resources.length} resources`);
    res.json({ success: true, data });
  } catch (error) {
    console.error('❌ Error fetching resources:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch resources' });
  }
});

// Get single resource
router.get('/:id', protect, async (req, res) => {
  try {
    const resource = await Resource.findById(req.params.id)
      .populate('course_id', 'name code')
      .populate('uploaded_by', 'name email');
    
    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    
    const summary = await ResourceRating.aggregate([
      { $match: { resourceId: resource._id } },
      {
        $group: {
          _id: '$resourceId',
          average_rating: { $avg: '$stars' },
          rating_count: { $sum: 1 },
        },
      },
    ]);

    const obj = resource.toObject({ virtuals: true });
    obj.average_rating = summary[0]?.average_rating ?? 0;
    obj.rating_count = summary[0]?.rating_count ?? 0;

    res.json({ success: true, data: obj });
  } catch (error) {
    console.error('Error fetching resource:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch resource' });
  }
});

// Increment resource views
router.post('/:id/view', protect, async (req, res) => {
  try {
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { $inc: { view_count: 1 } },
      { new: true }
    ).select('_id view_count');

    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    res.json({ success: true, data: resource });
  } catch (error) {
    console.error('Error incrementing resource views:', error);
    res.status(500).json({ success: false, message: 'Failed to increment views' });
  }
});

// Upload resource
router.post('/', protect, upload.single('file'), async (req, res) => {
  try {
    const { title, description, course_id, type, file_url: body_file_url } = req.body;
    
    console.log('📤 Uploading resource:', { title, type, file: req.file?.filename, url: body_file_url });

    if (!title || !course_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title and course are required' 
      });
    }

    let file_url = body_file_url || null;
    let file_name = null;
    let file_size = null;

    if (req.file) {
      file_url = `/uploads/${req.file.filename}`;
      file_name = req.file.originalname;
      file_size = req.file.size;
      console.log('📁 File saved:', file_url);
    } else if (file_url) {
      file_name = 'External Link';
    }

    const resource = await Resource.create({
      title,
      description,
      course_id,
      type: type || 'document',
      file_url,
      file_name,
      file_size,
      uploaded_by: req.user.id,
    });

    await resource.populate('course_id', 'name code');
    await resource.populate('uploaded_by', 'name email');

    console.log('✅ Resource created successfully');
    res.status(201).json({ success: true, data: resource });
  } catch (error) {
    console.error('❌ Error uploading resource:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to upload resource' });
  }
});

// Update resource
router.put('/:id', protect, async (req, res) => {
  try {
    const existing = await Resource.findById(req.params.id).select('uploaded_by');
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    const isUploader = String(existing.uploaded_by) === String(req.user.id);
    const isPrivileged = req.user.role === 'teacher' || req.user.role === 'admin';
    if (!isUploader && !isPrivileged) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('course_id', 'name code')
    .populate('uploaded_by', 'name email');

    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    res.json({ success: true, data: resource });
  } catch (error) {
    console.error('Error updating resource:', error);
    res.status(400).json({ success: false, message: 'Failed to update resource' });
  }
});

// Delete resource
router.delete('/:id', protect, async (req, res) => {
  try {
    const existing = await Resource.findById(req.params.id).select('uploaded_by');
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    const isUploader = String(existing.uploaded_by) === String(req.user.id);
    const isPrivileged = req.user.role === 'teacher' || req.user.role === 'admin';
    if (!isUploader && !isPrivileged) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const resource = await Resource.findByIdAndDelete(req.params.id);
    
    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }
    
    res.json({ success: true, message: 'Resource deleted successfully' });
  } catch (error) {
    console.error('Error deleting resource:', error);
    res.status(400).json({ success: false, message: 'Failed to delete resource' });
  }
});

export default router;