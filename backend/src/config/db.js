import mongoose from 'mongoose';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not set in .env file');
    process.exit(1);
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      console.log('✅ MongoDB Atlas connected');
      return;
    } catch (err) {
      console.error(`❌ MongoDB connection attempt ${attempt}/${MAX_RETRIES}:`, err.message);
      if (attempt < MAX_RETRIES) {
        console.log(`   Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      } else {
        console.error('\n💡 Common fixes:');
        console.error('   1. MongoDB Atlas → Network Access → Add your IP (or 0.0.0.0/0 for testing)');
        console.error('   2. Verify username/password in MONGODB_URI');
        console.error('   3. Ensure the cluster is running (not paused)');
        process.exit(1);
      }
    }
  }
}
