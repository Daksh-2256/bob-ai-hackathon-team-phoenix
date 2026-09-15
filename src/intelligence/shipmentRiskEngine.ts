// ============================================================
// SupplyGuard AI — Shipment Risk Engine
// ============================================================
import type { Disruption, RiskScore, RiskLevel, RiskFactor, Shipment } from '../shared/types';
import { state } from '../data/index';
import { calculateDisruptionSeverityScore, getActiveDisruptions } from './disruptionEngine';

/**
 * Returns LOW | MEDIUM | HIGH | CRITICAL based on numeric risk score.
 */
export function getRiskLevel(score: number): RiskLevel {
  if (score >= 75) return 'CRITICAL';
  if (score >= 55) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}

/**
 * Determines whether a route is affected by a disruption.
 */
function routeOverlapsDisruption(routeId: string, disruption: Disruption): boolean {
  return disruption.affectedRoutes.includes(routeId);
}

/**
 * Core risk analysis for a single shipment against current active disruptions.
 *
 * Factors scored (0–100 each) with weights summing to 1.0:
 * 1. Route disruption overlap       — 0.35
 * 2. Cargo value magnitude          — 0.15
 * 3. Priority level                 — 0.15
 * 4. Cold chain sensitivity         — 0.15
 * 5. Delivery deadline proximity    — 0.10
 * 6. Current delay accumulation     — 0.10
 */
export function analyzeShipmentRisk(
  shipment: Shipment,
  activeDisruptions: Disruption[]
): RiskScore {
  const factors: RiskFactor[] = [];
  const reasons: string[] = [];

  // ── Factor 1: Route overlap with active disruptions ─────────
  const overlappingDisruptions = activeDisruptions.filter(d =>
    routeOverlapsDisruption(shipment.routeId, d)
  );

  let routeScore = 0;
  if (overlappingDisruptions.length > 0) {
    const maxDisruptionScore = Math.max(
      ...overlappingDisruptions.map(d => calculateDisruptionSeverityScore(d))
    );
    routeScore = maxDisruptionScore;
    const disruptionNames = overlappingDisruptions.map(d => d.name).join(', ');
    reasons.push(`Route ${shipment.routeId} is directly affected by: ${disruptionNames}`);
  } else {
    // Check if carrier is affected even if route isn't explicitly listed
    const carrierDisruptions = activeDisruptions.filter(d =>
      d.affectedCarriers?.includes(shipment.carrierId)
    );
    if (carrierDisruptions.length > 0) {
      routeScore = 40;
      reasons.push(`Carrier ${shipment.carrierId} is impacted by active disruption(s)`);
    }
  }

  // Estimate delay from disruptions
  let estimatedDelayHours = shipment.delayHours;
  if (overlappingDisruptions.length > 0) {
    const maxDisruptionDelay = Math.max(
      ...overlappingDisruptions.map(d => d.estimatedDelayHours ?? 0)
    );
    estimatedDelayHours = Math.max(shipment.delayHours, maxDisruptionDelay);
  }

  factors.push({
    factor: 'Route Disruption Overlap',
    weight: 0.35,
    score: routeScore,
    description: overlappingDisruptions.length > 0
      ? `${overlappingDisruptions.length} active disruption(s) on route ${shipment.routeId}`
      : 'No direct route disruptions detected',
  });

  // ── Factor 2: Cargo value ─────────────────────────────────────
  // Normalize $0–$2.5M to 0–100
  const valueScore = Math.min((shipment.cargoValueUSD / 2_500_000) * 100, 100);
  factors.push({
    factor: 'Cargo Value',
    weight: 0.15,
    score: valueScore,
    description: `Cargo value $${(shipment.cargoValueUSD / 1000).toFixed(0)}K`,
  });
  if (shipment.cargoValueUSD >= 1_000_000) {
    reasons.push(`High-value cargo: $${(shipment.cargoValueUSD / 1_000_000).toFixed(2)}M at risk`);
  }

  // ── Factor 3: Priority ────────────────────────────────────────
  const priorityScores: Record<string, number> = {
    CRITICAL: 100, HIGH: 75, MEDIUM: 45, LOW: 20,
  };
  const priorityScore = priorityScores[shipment.priority] ?? 45;
  factors.push({
    factor: 'Shipment Priority',
    weight: 0.15,
    score: priorityScore,
    description: `Priority: ${shipment.priority}`,
  });

  // ── Factor 4: Cold chain sensitivity ─────────────────────────
  let coldChainScore = 0;
  if (shipment.isColdChain) {
    // Base score for any cold chain
    coldChainScore = 50;
    // Higher score for extreme cold ranges (ultra-cold, frozen)
    if (shipment.temperatureMax !== undefined && shipment.temperatureMax <= -18) {
      coldChainScore = 85; // frozen
    } else if (shipment.temperatureMax !== undefined && shipment.temperatureMax <= -60) {
      coldChainScore = 100; // ultra-cold
    }
    // If currently experiencing a disruption, cold chain risk is amplified
    if (routeScore > 50) {
      coldChainScore = Math.min(coldChainScore + 30, 100);
      reasons.push('Cold-chain cargo at elevated risk due to active disruption');
    }
    reasons.push(
      `Cold chain required: ${shipment.temperatureMin ?? '?'}°C to ${shipment.temperatureMax ?? '?'}°C`
    );
  }
  factors.push({
    factor: 'Cold Chain Sensitivity',
    weight: 0.15,
    score: coldChainScore,
    description: shipment.isColdChain
      ? `Temperature range: ${shipment.temperatureMin}°C to ${shipment.temperatureMax}°C`
      : 'Not a temperature-sensitive shipment',
  });

  // ── Factor 5: Delivery deadline proximity ─────────────────────
  const now = new Date();
  const eta = new Date(shipment.estimatedArrival);
  const hoursToDeadline = (eta.getTime() - now.getTime()) / (1000 * 60 * 60);
  let deadlineScore = 0;
  if (hoursToDeadline <= 0) {
    deadlineScore = 100; // overdue
    reasons.push('Shipment is past its estimated arrival time');
  } else if (hoursToDeadline <= 24) {
    deadlineScore = 85;
    reasons.push(`Delivery deadline within ${Math.round(hoursToDeadline)}h`);
  } else if (hoursToDeadline <= 72) {
    deadlineScore = 55;
  } else if (hoursToDeadline <= 168) {
    deadlineScore = 30;
  } else {
    deadlineScore = 10;
  }
  factors.push({
    factor: 'Deadline Proximity',
    weight: 0.10,
    score: deadlineScore,
    description: hoursToDeadline > 0
      ? `ETA in ${Math.round(hoursToDeadline)}h`
      : 'Past estimated arrival',
  });

  // ── Factor 6: Current delay accumulation ──────────────────────
  const delayScore = Math.min((estimatedDelayHours / 200) * 100, 100);
  factors.push({
    factor: 'Delay Accumulation',
    weight: 0.10,
    score: delayScore,
    description: `${estimatedDelayHours}h delay accumulated`,
  });
  if (estimatedDelayHours >= 72) {
    reasons.push(`Significant delay: ${estimatedDelayHours}h accumulated`);
  }

  // ── Weighted composite score ───────────────────────────────────
  const overallScore = Math.round(
    factors.reduce((sum, f) => sum + f.weight * f.score, 0)
  );

  const riskLevel = getRiskLevel(overallScore);
  const cargoValueAtRisk = overallScore >= 55 ? shipment.cargoValueUSD : 0;

  return {
    shipmentId: shipment.shipmentId,
    overallScore,
    riskLevel,
    estimatedDelayHours,
    cargoValueAtRisk,
    factors,
    reasons,
    calculatedAt: new Date().toISOString(),
  };
}

/**
 * Returns risk scores for all active shipments affected by current disruptions,
 * sorted by overall score descending.
 */
export function getAffectedShipments(
  disruptions?: Disruption[]
): Array<{ shipment: Shipment; riskScore: RiskScore }> {
  const activeDisruptions = disruptions ?? getActiveDisruptions();
  const activeShipments = state.shipments.filter(s => s.status !== 'DELIVERED');

  return activeShipments
    .map(shipment => ({
      shipment,
      riskScore: analyzeShipmentRisk(shipment, activeDisruptions),
    }))
    .filter(r => r.riskScore.overallScore > 0)
    .sort((a, b) => b.riskScore.overallScore - a.riskScore.overallScore);
}

/**
 * Returns the single highest-risk shipment.
 */
export function getHighestRiskShipment(): {
  shipment: Shipment;
  riskScore: RiskScore;
} | null {
  const results = getAffectedShipments();
  return results[0] ?? null;
}

/**
 * Returns all shipments at CRITICAL or HIGH risk level.
 */
export function getCriticalAndHighRiskShipments(): Array<{
  shipment: Shipment;
  riskScore: RiskScore;
}> {
  return getAffectedShipments().filter(
    r => r.riskScore.riskLevel === 'CRITICAL' || r.riskScore.riskLevel === 'HIGH'
  );
}

/**
 * Returns total cargo value currently at risk (score >= 55).
 */
export function getTotalCargoValueAtRisk(): number {
  return getAffectedShipments().reduce((sum, r) => sum + r.riskScore.cargoValueAtRisk, 0);
}
