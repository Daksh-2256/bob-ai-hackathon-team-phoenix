// ============================================================
// SupplyGuard AI — Route Mongoose Model
// ============================================================
import mongoose, { Schema, Document } from 'mongoose';
import type { Route, GeoLocation, Waypoint } from '../../../shared/types';

export interface RouteDocument extends Omit<Route, 'routeId'>, Document {
  routeId: string;
}

const GeoLocationSchema = new Schema<GeoLocation>(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    name: { type: String, required: true },
  },
  { _id: false }
);

const WaypointSchema = new Schema<Waypoint>(
  {
    location: { type: GeoLocationSchema, required: true },
    estimatedArrival: { type: String },
    type: {
      type: String,
      enum: ['ORIGIN', 'PORT', 'HUB', 'CUSTOMS', 'DESTINATION'],
      required: true,
    },
  },
  { _id: false }
);

const RouteSchema = new Schema<RouteDocument>(
  {
    routeId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    origin: { type: GeoLocationSchema, required: true },
    destination: { type: GeoLocationSchema, required: true },
    waypoints: { type: [WaypointSchema], default: [] },
    distanceKm: { type: Number, required: true },
    estimatedDays: { type: Number, required: true },
    baseCostUSD: { type: Number, required: true },
    carriers: { type: [String], default: [] },
    disruptionExposure: { type: Number, required: true },
    transportMode: {
      type: String,
      enum: ['SEA', 'AIR', 'ROAD', 'MULTIMODAL'],
      required: true,
      index: true,
    },
    isAlternative: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const RouteModel =
  mongoose.models['Route'] || mongoose.model<RouteDocument>('Route', RouteSchema);
