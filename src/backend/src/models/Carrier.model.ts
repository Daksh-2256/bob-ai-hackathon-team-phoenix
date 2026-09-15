// ============================================================
// SupplyGuard AI — Carrier Mongoose Model
// ============================================================
import mongoose, { Schema, Document } from 'mongoose';
import type { Carrier } from '../../../shared/types';

export interface CarrierDocument extends Omit<Carrier, 'carrierId'>, Document {
  carrierId: string;
}

const CarrierSchema = new Schema<CarrierDocument>(
  {
    carrierId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    region: { type: String, required: true },
    availableCapacity: { type: Number, required: true },
    totalCapacity: { type: Number, required: true },
    reliabilityScore: { type: Number, required: true },
    averageDelayHours: { type: Number, required: true },
    costMultiplier: { type: Number, required: true },
    supportedRoutes: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['ACTIVE', 'REDUCED_CAPACITY', 'SUSPENDED'],
      required: true,
      index: true,
    },
    contactEmail: { type: String, required: true },
    contactPhone: { type: String, required: true },
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

export const CarrierModel =
  mongoose.models['Carrier'] || mongoose.model<CarrierDocument>('Carrier', CarrierSchema);
