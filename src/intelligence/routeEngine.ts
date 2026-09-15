// ============================================================
// SupplyGuard AI — Route Intelligence Engine
// ============================================================
import type { Disruption, Route, RouteRecommendation, Shipment } from '../shared/types';
import { state } from '../data/index';
import { getActiveDisruptions } from './disruptionEngine';

/**
 * Calculates route risk score (0–100) given current active disruptions.
 *
 * Factors:
 * - Disruption count on route (high weight)
 * - Max disruption severity on route
 * - Route's baseline disruptionExposure field
 * - Number of disrupted carriers serving this route
 */
export function calculateRouteRisk(route: Route, disruptions: Disruption[]): number {
  const activeOnRoute = disruptions.filter(
    d => d.affectedRoutes.includes(route.routeId) && d.status === 'ACTIVE'
  );

  if (activeOnRoute.length === 0) {
    // No active disruptions — use baseline exposure score
    return Math.round(route.disruptionExposure * 0.4);
  }

  const maxSeverityScore = Math.max(
    ...activeOnRoute.map(d => {
      const scores: Record<string, number> = { CRITICAL: 90, HIGH: 70, MEDIUM: 45, LOW: 20 };
      return scores[d.severity] ?? 45;
    })
  );

  const countBonus = Math.min(activeOnRoute.length * 10, 30);

  // Carrier overlap — how many of this route's carriers are disrupted
  const disruptedCarriers = new Set(
    activeOnRoute.flatMap(d => d.affectedCarriers ?? [])
  );
  const routeCarrierCount = route.carriers.length || 1;
  const disrupted = route.carriers.filter(c => disruptedCarriers.has(c)).length;
  const carrierFraction = disrupted / routeCarrierCount;
  const carrierPenalty = Math.round(carrierFraction * 20);

  const score = maxSeverityScore + countBonus + carrierPenalty;
  return Math.min(score, 100);
}

/**
 * Returns 2–3 route recommendations for a shipment given current disruptions.
 * One route is marked RECOMMENDED, others as ALTERNATIVE or AVOID.
 */
export function getAlternativeRoutes(
  shipment: Shipment,
  activeDisruptions?: Disruption[]
): RouteRecommendation[] {
  const disruptions = activeDisruptions ?? getActiveDisruptions();
  const allRoutes = state.routes;

  // Find the shipment's current route
  const currentRoute = allRoutes.find(r => r.routeId === shipment.routeId);

  // Candidate routes: same origin/destination or same region
  const candidates = allRoutes.filter(r => {
    if (r.routeId === shipment.routeId) return false;
    // Must include at least one carrier that supports the cargo's requirements
    if (r.carriers.length === 0) return false;
    // Look for routes originating from same region (simplified: same origin city or nearby)
    const sameOriginRegion =
      r.origin.name === (currentRoute?.origin.name ?? shipment.origin.name) ||
      r.destination.name === shipment.destination.name;
    // Also include routes with low disruption exposure as generic alternatives
    const isLowRisk = r.disruptionExposure <= 30;
    return sameOriginRegion || isLowRisk;
  });

  // Score each candidate
  const scored = candidates
    .map(route => {
      const riskScore = calculateRouteRisk(route, disruptions);
      const estimatedDays = route.estimatedDays;
      const estimatedCostUSD = route.baseCostUSD * (1 + riskScore / 200);
      return { route, riskScore, estimatedDays, estimatedCostUSD };
    })
    .sort((a, b) => a.riskScore - b.riskScore);

  // Build recommendations (up to 3)
  const recommendations: RouteRecommendation[] = [];
  const top = scored.slice(0, 3);

  top.forEach((item, index) => {
    const { route, riskScore, estimatedDays, estimatedCostUSD } = item;
    const currentRisk = currentRoute
      ? calculateRouteRisk(currentRoute, disruptions)
      : 100;

    const isBetter = riskScore < currentRisk;
    const isSameETA = estimatedDays <= (currentRoute?.estimatedDays ?? 99) + 2;

    let recommendation: RouteRecommendation['recommendation'];
    if (index === 0 && isBetter) {
      recommendation = 'RECOMMENDED';
    } else if (riskScore <= 40) {
      recommendation = 'ALTERNATIVE';
    } else {
      recommendation = 'AVOID';
    }

    const daysSaved = (currentRoute?.estimatedDays ?? estimatedDays) - estimatedDays;
    const hoursSaved = daysSaved * 24;

    let reasoning: string;
    if (recommendation === 'RECOMMENDED') {
      reasoning =
        `This route avoids ${disruptions.filter(d => d.affectedRoutes.includes(shipment.routeId)).length} ` +
        `active disruption(s) on the current route. Risk score: ${riskScore}/100 ` +
        `vs current route risk. ${isSameETA ? 'Similar transit time.' : `Transit ${Math.abs(daysSaved)} day(s) ${daysSaved > 0 ? 'faster' : 'slower'}.`}`;
    } else if (recommendation === 'ALTERNATIVE') {
      reasoning =
        `Lower risk profile (${riskScore}/100) with ${route.carriers.length} carrier option(s). ` +
        `${route.transportMode} transport via ${route.waypoints.map(w => w.location.name).join(' → ')}.`;
    } else {
      reasoning =
        `High risk score ${riskScore}/100 — ${disruptions.filter(d => d.affectedRoutes.includes(route.routeId)).length} ` +
        `active disruption(s) detected. Not recommended unless no alternative exists.`;
    }

    const rec: RouteRecommendation = {
      route,
      estimatedDays,
      estimatedCostUSD: Math.round(estimatedCostUSD),
      riskScore,
      recommendation,
      reasoning,
    };
    if (hoursSaved > 0) rec.savingsVsCurrent = hoursSaved;
    recommendations.push(rec);
  });

  // If no candidates found, return a generic "use Cape bypass" recommendation
  if (recommendations.length === 0 && currentRoute) {
    const capeRoute = allRoutes.find(r => r.routeId === 'RT-017' || r.routeId === 'RT-009');
    if (capeRoute) {
      recommendations.push({
        route: capeRoute,
        estimatedDays: capeRoute.estimatedDays,
        estimatedCostUSD: Math.round(capeRoute.baseCostUSD * 1.1),
        riskScore: calculateRouteRisk(capeRoute, disruptions),
        recommendation: 'RECOMMENDED',
        reasoning:
          'Cape of Good Hope bypass route avoids Red Sea and Suez disruptions. Longer transit but significantly lower risk.',
      });
    }
  }

  return recommendations;
}

/**
 * Returns the safest route for a shipment (lowest risk score).
 */
export function getSafestRoute(
  shipment: Shipment
): RouteRecommendation | null {
  const recommendations = getAlternativeRoutes(shipment);
  return recommendations.find(r => r.recommendation === 'RECOMMENDED') ?? recommendations[0] ?? null;
}
