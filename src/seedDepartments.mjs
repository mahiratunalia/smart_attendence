// server/src/seedDepartments.mjs
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

// Department Schema
const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
  },
}, {
  timestamps: true,
});

const Department = mongoose.model('Department', departmentSchema);

// Sample departments
const departments = [
  { name: 'Computer Science', code: 'CS' },
  { name: 'Electrical Engineering', code: 'EE' },
  { name: 'Mechanical Engineering', code: 'ME' },
  { name: 'Civil Engineering', code: 'CE' },
  { name: 'Business Administration', code: 'BA' },
  { name: 'Mathematics', code: 'MATH' },
  { name: 'Physics', code: 'PHY' },
  { name: 'Chemistry', code: 'CHEM' },
  { name: 'Biology', code: 'BIO' },
  { name: 'English Literature', code: 'ENG' },
];

async function seedDepartments() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing departments
    console.log('🗑️  Clearing existing departments...');
    await Department.deleteMany({});
    console.log('✅ Cleared existing departments');

    // Insert new departments
    console.log('📝 Inserting departments...');
    const result = await Department.insertMany(departments);
    console.log(`✅ Successfully seeded ${result.length} departments:`);
    result.forEach(dept => {
      console.log(`   - ${dept.name} (${dept.code})`);
    });

    console.log('\n✨ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding departments:', error);
    process.exit(1);
  }
}

seedDepartments();