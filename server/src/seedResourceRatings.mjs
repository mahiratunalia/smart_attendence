import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const resourceSchema = new mongoose.Schema({}, { timestamps: true, strict: false });
const userSchema = new mongoose.Schema({}, { timestamps: true, strict: false });
const ratingSchema = new mongoose.Schema({
  resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  stars: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String },
}, { timestamps: true });

ratingSchema.index({ resourceId: 1, userId: 1 }, { unique: true });

const Resource = mongoose.model('Resource', resourceSchema);
const User = mongoose.model('User', userSchema);
const ResourceRating = mongoose.model('ResourceRating', ratingSchema);

function pickManyUnique(ids, count, excludeId) {
  const pool = ids.filter((id) => String(id) !== String(excludeId));
  const picked = new Set();
  while (picked.size < count && picked.size < pool.length) {
    const id = pool[Math.floor(Math.random() * pool.length)];
    picked.add(String(id));
  }
  return Array.from(picked);
}

function sampleStars() {
  // bias toward 3-5 so rankings look reasonable
  const r = Math.random();
  if (r < 0.08) return 1;
  if (r < 0.18) return 2;
  if (r < 0.45) return 3;
  if (r < 0.78) return 4;
  return 5;
}

async function seedResourceRatings() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance-system');
    console.log('✅ Connected to MongoDB');

    const resources = await Resource.find().select('_id uploaded_by title type');
    const users = await User.find().select('_id role name email');

    if (resources.length === 0) {
      console.log('❌ No resources found. Run seed:resources first.');
      process.exit(1);
    }

    const rateableUserIds = users
      .filter((u) => ['student', 'teacher', 'parent'].includes(String(u.role)))
      .map((u) => u._id);

    if (rateableUserIds.length === 0) {
      console.log('❌ No users found to create ratings. Run seed:users first.');
      process.exit(1);
    }

    console.log('🗑️  Clearing existing resource ratings...');
    await ResourceRating.deleteMany({});

    const ratings = [];

    // Make some resources "popular" with more ratings
    const popularCount = Math.min(10, resources.length);
    const popularResourceIds = new Set(
      resources
        .slice(0, popularCount)
        .map((r) => String(r._id))
    );

    for (const r of resources) {
      const isPopular = popularResourceIds.has(String(r._id));
      const targetRatings = isPopular
        ? 10 + Math.floor(Math.random() * 10) // 10-19
        : 3 + Math.floor(Math.random() * 6);  // 3-8

      const raters = pickManyUnique(rateableUserIds, targetRatings, r.uploaded_by);
      for (const userIdStr of raters) {
        const stars = sampleStars();
        ratings.push({
          resourceId: r._id,
          userId: new mongoose.Types.ObjectId(userIdStr),
          stars,
          comment: stars >= 4 ? 'Very helpful resource.' : stars === 3 ? 'Good.' : 'Could be improved.',
        });
      }
    }

    console.log(`📝 Creating ${ratings.length} ratings...`);
    await ResourceRating.insertMany(ratings, { ordered: false });

    console.log('✅ Seeded resource ratings successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding resource ratings:', error);
    process.exit(1);
  }
}

seedResourceRatings();
