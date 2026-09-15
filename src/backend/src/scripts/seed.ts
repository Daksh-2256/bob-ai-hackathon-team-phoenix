// ============================================================
// SupplyGuard AI — Standalone MongoDB Seeder Script
// Run via: npm run db:seed
// ============================================================
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from backend or root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { connectDB, disconnectDB } from '../config/db';
import { seedDatabase } from '../services/dbSync';

async function run() {
  console.log('[SupplyGuard AI] Starting MongoDB database seeder...');
  const connected = await connectDB();

  if (!connected) {
    console.error('[SupplyGuard AI] Could not connect to MongoDB. Please ensure MongoDB is running or check your MONGODB_URI.');
    process.exit(1);
  }

  try {
    await seedDatabase(true); // force re-seed
    console.log('[SupplyGuard AI] Database seeding complete!');
  } catch (err: any) {
    console.error('[SupplyGuard AI] Seeding error:', err);
    process.exit(1);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

run();
