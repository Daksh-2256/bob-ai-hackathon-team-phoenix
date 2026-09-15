// ============================================================
// SupplyGuard AI — FleetAsset Mongoose Model
// ============================================================
import mongoose, { Schema, Document } from 'mongoose';
import type { FleetAsset, GeoLocation } from '../../../shared/types';

export interface FleetAssetDocument extends Omit<FleetAsset, 'assetId'>, Document {
  assetId: string;
}

const GeoLocationSchema = new Schema<GeoLocation>(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    name: { type: String, required: true },
  },
  { _id: false }
);

const FleetAssetSchema = new Schema<FleetAssetDocument>(
  {
    assetId: { type: String, required: true, unique: true, index: true },
    type: {
      type: String,
      enum: ['TRUCK', 'CONTAINER', 'VESSEL'],
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    registrationNumber: { type: String, required: true },
    carrierId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['IN_TRANSIT', 'ASSIGNED', 'IDLE', 'MAINTENANCE', 'AVAILABLE'],
      required: true,
      index: true,
    },
    currentLocation: { type: GeoLocationSchema, required: true },
    capacity: { type: Number, required: true },
    utilizationPct: { type: Number, required: true },
    lastActivity: { type: String, required: true },
    assignedShipmentId: { type: String },
    maintenanceDue: { type: String },
    fuelLevelPct: { type: Number },
    isColdCapable: { type: Boolean, required: true },
  },
  {
    timestamps: true,
  }
);

export const FleetAssetModel =
  mongoose.models['FleetAsset'] || mongoose.model<FleetAssetDocument>('FleetAsset', FleetAssetSchema);
