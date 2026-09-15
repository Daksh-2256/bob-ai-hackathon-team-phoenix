// ============================================================
// SupplyGuard AI — Disruption Intelligence Engine
// ============================================================
import type { Disruption, Route } from '../shared/types';
import { state } from '../data/index';

/**
 * Returns all currently ACTIVE disruptions from live state.
 */
export function getActiveDisruptions(): Disruption[] {
  return state.disruptions.filter(d => d.status === 'ACTIVE');
}

/**
 * Returns all disruptions being monitored (ACTIVE + MONITORING).
 */
export function getMonitoredDisruptions(): Disruption[] {
  return state.disruptions.filter(d => d.status === 'ACTIVE' || d.status === 'MONITORING');
}

/**
 * Returns routes affected by a specific disruption.
 */
export function getAffectedRoutes(disruptionId: string): Route[] {
  const disruption = state.disruptions.find(d => d.id === disruptionId);
  if (!disruption) return [];
  return state.routes.filter(r => disruption.affectedRoutes.includes(r.routeId));
}

/**
 * Returns disruptions that affect a given route.
 */
export function getDisruptionsForRoute(routeId: string): Disruption[] {
  return state.disruptions.filter(
    d => d.status === 'ACTIVE' && d.affectedRoutes.includes(routeId)
  );
}

/**
 * Returns disruptions affecting a given carrier.
 */
export function getDisruptionsForCarrier(carrierId: string): Disruption[] {
  return state.disruptions.filter(
    d => d.status === 'ACTIVE' && d.affectedCarriers?.includes(carrierId)
  );
}

/**
 * Calculates a disruption severity score 0–100.
 *
 * Factors:
 * - Base severity level (LOW=20, MEDIUM=45, HIGH=70, CRITICAL=95)
 * - Number of affected routes (each +2, max +15)
 * - Number of affected carriers (each +5, max +20)
 * - Estimated delay hours (normalized, max +20)
 * - Impact radius (normalized, max +10)
 */
export function calculateDisruptionSeverityScore(disruption: Disruption): number {
  const baseScores: Record<string, number> = {
    LOW: 20,
    MEDIUM: 45,
    HIGH: 70,
    CRITICAL: 95,
  };

  let score = baseScores[disruption.severity] ?? 45;

  // Route coverage
  const routeBonus = Math.min(disruption.affectedRoutes.length * 2, 15);
  score += routeBonus;

  // Carrier impact
  const carrierBonus = Math.min((disruption.affectedCarriers?.length ?? 0) * 5, 20);
  score += carrierBonus;

  // Delay impact (cap at 200h for normalization)
  const delayHours = disruption.estimatedDelayHours ?? 0;
  const delayBonus = Math.min((delayHours / 200) * 20, 20);
  score += delayBonus;

  // Geographic scope (cap at 2000km for normalization)
  const radiusKm = disruption.impactRadius ?? 0;
  const radiusBonus = Math.min((radiusKm / 2000) * 10, 10);
  score += radiusBonus;

  // Resolved disruptions score 0
  if (disruption.status === 'RESOLVED') return 0;

  return Math.min(Math.round(score), 100);
}

/**
 * Returns disruptions sorted by severity score descending.
 */
export function getDisruptionsRankedBySeverity(): Array<{
  disruption: Disruption;
  score: number;
}> {
  return state.disruptions
    .filter(d => d.status !== 'RESOLVED')
    .map(d => ({ disruption: d, score: calculateDisruptionSeverityScore(d) }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Returns a human-readable summary of a disruption.
 */
export function summarizeDisruption(disruption: Disruption): string {
  const score = calculateDisruptionSeverityScore(disruption);
  const routeCount = disruption.affectedRoutes.length;
  const delayText = disruption.estimatedDelayHours
    ? `${disruption.estimatedDelayHours}h estimated delay`
    : 'delay unknown';
  return (
    `[${disruption.severity}] ${disruption.name} — Severity score: ${score}/100. ` +
    `${routeCount} route(s) affected. ${delayText}. Status: ${disruption.status}.`
  );
}
