import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true },
}, { timestamps: true });

const Department = mongoose.model('Department', departmentSchema);

const departments = [
  { name: 'Computer Science (CSE)', code: 'CSE' },
  { name: 'Electrical Engineering (EEE)', code: 'EEE' },
  { name: 'Mechanical Engineering (ME)', code: 'ME' },
  { name: 'Civil Engineering (CE)', code: 'CE' },
  { name: 'Business Administration (BBA)', code: 'BBA' },
  { name: 'Mathematics (MATH)', code: 'MATH' },
  { name: 'Physics (PHY)', code: 'PHY' },
  { name: 'Chemistry (CHEM)', code: 'CHEM' },
  { name: 'Biology (BIO)', code: 'BIO' },
  { name: 'English Literature (ENG)', code: 'ENG' },
  { name: 'Economics (ECON)', code: 'ECON' },
  { name: 'Architecture (ARCH)', code: 'ARCH' },
  { name: 'Pharmacy (PHARM)', code: 'PHARM' },
  { name: 'Law (LAW)', code: 'LAW' },
  { name: 'Medicine (MED)', code: 'MED' },
  { name: 'Accounting (ACC)', code: 'ACC' },
  { name: 'Marketing (MKT)', code: 'MKT' },
  { name: 'Finance (FIN)', code: 'FIN' },
  { name: 'Information Technology (IT)', code: 'IT' },
  { name: 'Software Engineering (SWE)', code: 'SWE' },
];

async function seedDepartments() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected');

    console.log('🗑️  Clearing existing...');
    await Department.deleteMany({});

    console.log('📝 Inserting departments...');
    const result = await Department.insertMany(departments);
    console.log(`✅ Seeded ${result.length} departments`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedDepartments();