import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resourceSchema = new mongoose.Schema({
  title: String,
  description: String,
  course_id: mongoose.Schema.Types.ObjectId,
  type: String,
  file_url: String,
  file_name: String,
  file_size: Number,
  uploaded_by: mongoose.Schema.Types.ObjectId,
  view_count: { type: Number, default: 0 },
}, { timestamps: true });

const courseSchema = new mongoose.Schema({
  name: String,
  code: String,
  teacherId: mongoose.Schema.Types.ObjectId
});

const userSchema = new mongoose.Schema({
  name: String,
  role: String
});

const Resource = mongoose.model('Resource', resourceSchema);
const Course = mongoose.model('Course', courseSchema);
const User = mongoose.model('User', userSchema);

async function seedResources() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-system');
    console.log('✅ Connected to MongoDB');

    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Created uploads directory');
    }

    // Get courses and teachers
    const courses = await Course.find();
    const teachers = await User.find({ role: 'teacher' });
    const students = await User.find({ role: 'student' });

    if (courses.length === 0) {
      console.log('❌ No courses found. Please run seed:lectures first.');
      process.exit(1);
    }

    console.log(`📚 Found ${courses.length} courses`);

    // Clear existing resources
    console.log('🗑️  Clearing existing resources...');
    await Resource.deleteMany({});

    const pickTeacher = (course) => {
      if (course.teacherId) return course.teacherId;
      return teachers[0]?._id;
    };

    const pickStudent = () => {
      if (students.length === 0) return null;
      return students[Math.floor(Math.random() * students.length)]?._id || null;
    };

    const resources = [];
    for (const course of courses) {
      const teacherId = pickTeacher(course);
      if (!teacherId) continue;

      const safeCode = (course.code || 'COURSE').toLowerCase();
      resources.push(
        {
          title: `${course.code} Syllabus & Overview`,
          description: `Course outline, grading policy, and weekly plan for ${course.code}.`,
          course_id: course._id,
          type: 'document',
          file_url: `/uploads/${safeCode}-syllabus.pdf`,
          file_name: `${safeCode}-syllabus.pdf`,
          file_size: 1024 * 200,
          uploaded_by: teacherId,
          view_count: Math.floor(Math.random() * 80),
        },
        {
          title: `${course.code} Lecture Slides (Week 1)`,
          description: `Intro slides for ${course.code}.`,
          course_id: course._id,
          type: 'presentation',
          file_url: `/uploads/${safeCode}-week1.pptx`,
          file_name: `${safeCode}-week1.pptx`,
          file_size: 1024 * 350,
          uploaded_by: teacherId,
          view_count: Math.floor(Math.random() * 120),
        },
        {
          title: `${course.code} Reference Link`,
          description: `External reference material for ${course.code}.`,
          course_id: course._id,
          type: 'link',
          file_url: 'https://developer.mozilla.org/',
          file_name: `${safeCode}-reference`,
          uploaded_by: teacherId,
          view_count: Math.floor(Math.random() * 200),
        }
      );

      // Add a couple student-shared resources to enable "Top students" rankings
      const studentId = pickStudent();
      if (studentId) {
        resources.push(
          {
            title: `${course.code} Student Notes`,
            description: `Student-made notes and summaries for ${course.code}.`,
            course_id: course._id,
            type: 'document',
            file_url: `/uploads/${safeCode}-student-notes.pdf`,
            file_name: `${safeCode}-student-notes.pdf`,
            file_size: 1024 * 180,
            uploaded_by: studentId,
            view_count: Math.floor(Math.random() * 150),
          },
          {
            title: `${course.code} Helpful Practice Link`,
            description: `Practice problems shared by a student for ${course.code}.`,
            course_id: course._id,
            type: 'link',
            file_url: 'https://www.khanacademy.org/',
            file_name: `${safeCode}-practice`,
            uploaded_by: studentId,
            view_count: Math.floor(Math.random() * 250),
          }
        );
      }
    }

    // Generate dummy files
    console.log('📁 Generating dummy files for resources...');
    for (const res of resources) {
      if (res.file_name && res.type !== 'link' && res.type !== 'video') {
        const filePath = path.join(uploadsDir, res.file_name);
        if (!fs.existsSync(filePath)) {
          fs.writeFileSync(filePath, `This is a dummy file for ${res.title}. In a real app, this would be the actual content.`);
          console.log(`   Created dummy file: ${res.file_name}`);
        }
      }
    }

    console.log('📝 Creating resources...');
    const result = await Resource.insertMany(resources);
    
    console.log(`✅ Successfully created ${result.length} resources:\n`);
    
    // Group by type
    const grouped = {
      document: result.filter(r => r.type === 'document'),
      presentation: result.filter(r => r.type === 'presentation'),
      video: result.filter(r => r.type === 'video'),
      link: result.filter(r => r.type === 'link')
    };

    console.log(`📄 Documents: ${grouped.document.length}`);
    grouped.document.forEach(r => {
      console.log(`   - ${r.title}`);
    });

    console.log(`\n📊 Presentations: ${grouped.presentation.length}`);
    grouped.presentation.forEach(r => {
      console.log(`   - ${r.title}`);
    });

    console.log(`\n🎥 Videos: ${grouped.video.length}`);
    grouped.video.forEach(r => {
      console.log(`   - ${r.title}`);
    });

    console.log(`\n🔗 Links: ${grouped.link.length}`);
    grouped.link.forEach(r => {
      console.log(`   - ${r.title}`);
    });

    console.log('\n✨ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedResources();
