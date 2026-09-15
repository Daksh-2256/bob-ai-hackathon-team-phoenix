// ============================================================
// SupplyGuard AI — Carrier Intelligence Engine
// ============================================================
import type { Carrier, CarrierRecommendation, Shipment } from '../shared/types';
import { state } from '../data/index';
import { getDisruptionsForCarrier } from './disruptionEngine';

/**
 * Composite scoring for a carrier (0–100).
 *
 * Weights:
 * - Reliability score       0.35
 * - Available capacity       0.25
 * - Cost (inverse)           0.20
 * - Route support            0.10
 * - Active disruption penalty -0.10
 */
export function scoreCarrier(carrier: Carrier, routeId?: string): number {
  // Reliability: already 0–100
  const reliabilityScore = carrier.reliabilityScore;

  // Capacity: normalize to 0–100 (10,000 TEU = 100)
  const capacityScore = Math.min((carrier.availableCapacity / 10_000) * 100, 100);

  // Cost: lower cost = higher score (0.7x multiplier → 100; 2.5x → ~0)
  const costScore = Math.max(0, 100 - ((carrier.costMultiplier - 0.7) / 1.8) * 100);

  // Route support
  const routeScore = routeId && carrier.supportedRoutes.includes(routeId) ? 100 : 40;

  // Disruption penalty
  const disruptions = getDisruptionsForCarrier(carrier.carrierId);
  const disruptionPenalty = disruptions.length > 0 ? 30 * disruptions.length : 0;

  const raw =
    reliabilityScore * 0.35 +
    capacityScore * 0.25 +
    costScore * 0.20 +
    routeScore * 0.10;

  return Math.max(0, Math.min(100, Math.round(raw - disruptionPenalty)));
}

/**
 * Ranks a list of carriers by composite score.
 */
export function rankCarriers(
  carriers: Carrier[],
  criteria: { routeId?: string; excludeCarrierId?: string }
): Carrier[] {
  return carriers
    .filter(c => c.carrierId !== criteria.excludeCarrierId)
    .filter(c => c.status !== 'SUSPENDED')
    .sort(
      (a, b) =>
        scoreCarrier(b, criteria.routeId) - scoreCarrier(a, criteria.routeId)
    );
}

/**
 * Returns top 3 carrier recommendations for a shipment,
 * optionally excluding the current carrier.
 */
export function getAlternativeCarriers(
  shipment: Shipment,
  excludeCarrierId?: string
): CarrierRecommendation[] {
  const exclude = excludeCarrierId ?? shipment.carrierId;
  const route = state.routes.find(r => r.routeId === shipment.routeId);

  const eligibleCarriers = state.carriers.filter(carrier => {
    if (carrier.carrierId === exclude) return false;
    if (carrier.status === 'SUSPENDED') return false;
    // Must support the route or have available capacity
    const supportsRoute = route ? carrier.supportedRoutes.includes(route.routeId) : false;
    const hasCapacity = carrier.availableCapacity > 0;
    return supportsRoute || hasCapacity;
  });

  const ranked = rankCarriers(eligibleCarriers, {
    routeId: shipment.routeId,
    excludeCarrierId: exclude,
  });

  return ranked.slice(0, 3).map((carrier, index) => {
    const score = scoreCarrier(carrier, shipment.routeId);
    const disruptions = getDisruptionsForCarrier(carrier.carrierId);
    const supportsRoute = route ? carrier.supportedRoutes.includes(route.routeId) : false;

    const pros: string[] = [];
    const cons: string[] = [];

    if (carrier.reliabilityScore >= 85) pros.push(`High reliability score: ${carrier.reliabilityScore}/100`);
    if (carrier.availableCapacity > 2000) pros.push(`Large available capacity: ${carrier.availableCapacity} TEU`);
    if (carrier.costMultiplier < 1.0) pros.push(`Below-baseline cost (${carrier.costMultiplier.toFixed(2)}x)`);
    if (supportsRoute) pros.push(`Direct route support for ${shipment.routeId}`);
    if (carrier.averageDelayHours <= 4) pros.push(`Low average delay: ${carrier.averageDelayHours}h`);

    if (carrier.costMultiplier > 1.5) cons.push(`Premium cost: ${carrier.costMultiplier.toFixed(2)}x baseline`);
    if (carrier.reliabilityScore < 80) cons.push(`Moderate reliability: ${carrier.reliabilityScore}/100`);
    if (!supportsRoute) cons.push(`Does not directly serve route ${shipment.routeId} — may require transshipment`);
    if (disruptions.length > 0) cons.push(`Affected by ${disruptions.length} active disruption(s)`);
    if (carrier.availableCapacity < 500) cons.push(`Limited capacity: ${carrier.availableCapacity} TEU`);

    const estimatedCostUSD = (route?.baseCostUSD ?? 10000) * carrier.costMultiplier;

    const reasoning =
      `${carrier.name} ranked #${index + 1} with composite score ${score}/100. ` +
      `Reliability: ${carrier.reliabilityScore}/100. ` +
      `Available capacity: ${carrier.availableCapacity} TEU. ` +
      `${supportsRoute ? 'Supports this route directly.' : 'Route support via transshipment.'} ` +
      `${disruptions.length === 0 ? 'No active disruptions.' : `Disrupted: ${disruptions.map(d => d.name).join(', ')}.`}`;

    return {
      carrier,
      rank: index + 1,
      score,
      availableCapacity: carrier.availableCapacity,
      estimatedCostUSD: Math.round(estimatedCostUSD),
      reasoning,
      pros,
      cons,
    };
  });
}

/**
 * Returns the single best carrier recommendation.
 */
export function getBestCarrier(shipment: Shipment): CarrierRecommendation | null {
  const recommendations = getAlternativeCarriers(shipment);
  return recommendations[0] ?? null;
}
