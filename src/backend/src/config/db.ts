// ============================================================
// SupplyGuard AI — MongoDB Connection Configuration
// ============================================================
import mongoose from 'mongoose';

let isConnected = false;

export async function connectDB(): Promise<boolean> {
  const uri = process.env['MONGODB_URI'] || 'mongodb://localhost:27017/supplyguard';

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000, // 3s timeout to avoid hanging when local MongoDB is not running
    });
    isConnected = true;
    console.log(`[SupplyGuard AI] [MongoDB] Connected successfully to ${uri}`);
    return true;
  } catch (error: any) {
    isConnected = false;
    console.warn(
      `[SupplyGuard AI] [MongoDB] Could not connect (${error.message}). Running in in-memory state mode.`
    );
    return false;
  }
}

export function isDatabaseConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

export async function disconnectDB(): Promise<void> {
  if (isConnected) {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[SupplyGuard AI] [MongoDB] Disconnected.');
  }
}
