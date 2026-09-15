// ============================================================
// SupplyGuard AI — Disruption Mongoose Model
// ============================================================
import mongoose, { Schema, Document } from 'mongoose';
import type { Disruption } from '../../../shared/types';

export interface DisruptionDocument extends Omit<Disruption, 'id'>, Document {
  id: string;
}

const DisruptionSchema = new Schema<DisruptionDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    type: {
      type: String,
      enum: [
        'WEATHER',
        'PORT_STRIKE',
        'GEOPOLITICAL',
        'ROAD_CLOSURE',
        'AIRPORT_CLOSURE',
        'INFRASTRUCTURE_FAILURE',
        'CARRIER_CAPACITY_LOSS',
      ],
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    location: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true,
      index: true,
    },
    startTime: { type: String, required: true },
    expectedEndTime: { type: String, required: true },
    affectedRoutes: { type: [String], default: [] },
    affectedCarriers: { type: [String], default: [] },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'RESOLVED', 'MONITORING'],
      required: true,
      index: true,
    },
    impactRadius: { type: Number },
    estimatedDelayHours: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export const DisruptionModel =
  mongoose.models['Disruption'] || mongoose.model<DisruptionDocument>('Disruption', DisruptionSchema);
