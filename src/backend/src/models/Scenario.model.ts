// ============================================================
// SupplyGuard AI — Scenario Mongoose Model
// ============================================================
import mongoose, { Schema, Document } from 'mongoose';
import type { DemoScenario } from '../../../shared/types';

export interface ScenarioDocument extends Omit<DemoScenario, 'scenarioId'>, Document {
  scenarioId: string;
}

const ScenarioSchema = new Schema<ScenarioDocument>(
  {
    scenarioId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    activateDisruptions: { type: [String], default: [] },
    affectedShipments: { type: [String], default: [] },
    triggerColdChainEvents: { type: Boolean, default: false },
    coldChainShipments: { type: [String], default: [] },
    expectedActions: { type: [String], default: [] },
    durationMinutes: { type: Number, required: true },
    isActive: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const ScenarioModel =
  mongoose.models['Scenario'] || mongoose.model<ScenarioDocument>('Scenario', ScenarioSchema);
