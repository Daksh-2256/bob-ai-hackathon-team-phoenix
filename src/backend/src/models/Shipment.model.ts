// ============================================================
// SupplyGuard AI — Shipment Mongoose Model
// ============================================================
import mongoose, { Schema, Document } from 'mongoose';
import type { Shipment, GeoLocation, TrackingEvent } from '../../../shared/types';

export interface ShipmentDocument extends Omit<Shipment, 'shipmentId'>, Document {
  shipmentId: string;
}

const GeoLocationSchema = new Schema<GeoLocation>(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    name: { type: String, required: true },
  },
  { _id: false }
);

const TrackingEventSchema = new Schema<TrackingEvent>(
  {
    timestamp: { type: String, required: true },
    location: { type: GeoLocationSchema, required: true },
    event: { type: String, required: true },
    details: { type: String },
  },
  { _id: false }
);

const ShipmentSchema = new Schema<ShipmentDocument>(
  {
    shipmentId: { type: String, required: true, unique: true, index: true },
    carrierId: { type: String, required: true, index: true },
    routeId: { type: String, required: true },
    origin: { type: GeoLocationSchema, required: true },
    destination: { type: GeoLocationSchema, required: true },
    currentLocation: { type: GeoLocationSchema, required: true },
    status: {
      type: String,
      enum: ['IN_TRANSIT', 'DELAYED', 'AT_RISK', 'DELIVERED', 'PENDING'],
      required: true,
      index: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true,
      index: true,
    },
    cargoType: { type: String, required: true },
    cargoDescription: { type: String, required: true },
    cargoValueUSD: { type: Number, required: true },
    weightKg: { type: Number, required: true },
    isColdChain: { type: Boolean, required: true, index: true },
    temperatureMin: { type: Number },
    temperatureMax: { type: Number },
    departureTime: { type: String, required: true },
    estimatedArrival: { type: String, required: true },
    actualArrival: { type: String },
    delayHours: { type: Number, default: 0 },
    trackingEvents: { type: [TrackingEventSchema], default: [] },
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

export const ShipmentModel =
  mongoose.models['Shipment'] || mongoose.model<ShipmentDocument>('Shipment', ShipmentSchema);
