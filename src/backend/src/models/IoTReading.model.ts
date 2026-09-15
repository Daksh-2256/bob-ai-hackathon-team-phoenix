// ============================================================
// SupplyGuard AI — IoTReading Mongoose Model
// ============================================================
import mongoose, { Schema, Document } from 'mongoose';
import type { IoTReading, GeoLocation } from '../../../shared/types';

export interface IoTReadingDocument extends Omit<IoTReading, 'readingId'>, Document {
  readingId: string;
}

const GeoLocationSchema = new Schema<GeoLocation>(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    name: { type: String, required: true },
  },
  { _id: false }
);

const IoTReadingSchema = new Schema<IoTReadingDocument>(
  {
    readingId: { type: String, required: true, unique: true, index: true },
    sensorId: { type: String, required: true, index: true },
    shipmentId: { type: String, required: true, index: true },
    timestamp: { type: String, required: true, index: true },
    temperature: { type: Number, required: true },
    humidity: { type: Number, required: true },
    location: { type: GeoLocationSchema, required: true },
    batteryPct: { type: Number, required: true },
    sensorStatus: {
      type: String,
      enum: ['NORMAL', 'WARNING', 'EXCURSION', 'CRITICAL', 'OFFLINE'],
      required: true,
      index: true,
    },
    pressure: { type: Number },
    shockDetected: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const IoTReadingModel =
  mongoose.models['IoTReading'] || mongoose.model<IoTReadingDocument>('IoTReading', IoTReadingSchema);
