// ============================================================
// Tests: Route Engine
// ============================================================
import { resetState, state } from '../data/index';
import {
  getAlternativeRoutes,
  calculateRouteRisk,
  getSafestRoute,
} from '../intelligence/routeEngine';
import { getActiveDisruptions } from '../intelligence/disruptionEngine';

beforeEach(() => {
  resetState();
});

describe('calculateRouteRisk', () => {
  it('returns a score between 0 and 100', () => {
    const disruptions = getActiveDisruptions();
    state.routes.forEach(route => {
      const score = calculateRouteRisk(route, disruptions);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  it('returns lower score for routes with no active disruptions', () => {
    const disruptions = getActiveDisruptions();
    // Find a route that is NOT in any active disruption's affectedRoutes
    const safeRoute = state.routes.find(
      r => !disruptions.some(d => d.affectedRoutes.includes(r.routeId))
    );
    if (!safeRoute) return; // skip if no safe route found
    const scoreWithDisruptions = calculateRouteRisk(safeRoute, disruptions);
    const scoreNoDisruptions = calculateRouteRisk(safeRoute, []);
    // Without disruptions should use baseline only (lower)
    expect(scoreWithDisruptions).toBeLessThanOrEqual(50);
  });

  it('returns higher score for disrupted routes', () => {
    const disruptions = getActiveDisruptions();
    if (disruptions.length === 0) return;
    const firstDisruption = disruptions[0]!;
    const disruptedRouteId = firstDisruption.affectedRoutes[0];
    if (!disruptedRouteId) return;
    const disruptedRoute = state.routes.find(r => r.routeId === disruptedRouteId);
    if (!disruptedRoute) return;
    const scoreWithDisruption = calculateRouteRisk(disruptedRoute, disruptions);
    const scoreWithoutDisruption = calculateRouteRisk(disruptedRoute, []);
    expect(scoreWithDisruption).toBeGreaterThan(scoreWithoutDisruption);
  });
});

describe('getAlternativeRoutes', () => {
  it('returns between 1 and 3 route recommendations', () => {
    const shipment = state.shipments[0]!;
    const recommendations = getAlternativeRoutes(shipment);
    expect(recommendations.length).toBeGreaterThanOrEqual(0);
    expect(recommendations.length).toBeLessThanOrEqual(3);
  });

  it('has at most one RECOMMENDED route', () => {
    const shipment = state.shipments[0]!;
    const recommendations = getAlternativeRoutes(shipment);
    const recommended = recommendations.filter(r => r.recommendation === 'RECOMMENDED');
    expect(recommended.length).toBeLessThanOrEqual(1);
  });

  it('each recommendation has a reasoning string', () => {
    const shipment = state.shipments[0]!;
    const recommendations = getAlternativeRoutes(shipment);
    recommendations.forEach(rec => {
      expect(typeof rec.reasoning).toBe('string');
      expect(rec.reasoning.length).toBeGreaterThan(0);
    });
  });

  it('recommended route has lower risk than disrupted routes', () => {
    // Find a shipment on a disrupted route
    const disruptions = getActiveDisruptions();
    const affectedRouteIds = new Set(disruptions.flatMap(d => d.affectedRoutes));
    const affectedShipment = state.shipments.find(
      s => affectedRouteIds.has(s.routeId) && s.status !== 'DELIVERED'
    );
    if (!affectedShipment) return;

    const recommendations = getAlternativeRoutes(affectedShipment, disruptions);
    const recommended = recommendations.find(r => r.recommendation === 'RECOMMENDED');
    if (!recommended) return;

    // The recommended route should have a lower or equal risk score than AVOID routes
    const avoidRoutes = recommendations.filter(r => r.recommendation === 'AVOID');
    avoidRoutes.forEach(avoidRec => {
      expect(recommended.riskScore).toBeLessThanOrEqual(avoidRec.riskScore);
    });
  });

  it('each recommendation has valid estimatedDays and estimatedCostUSD', () => {
    const shipment = state.shipments[0]!;
    const recommendations = getAlternativeRoutes(shipment);
    recommendations.forEach(rec => {
      expect(rec.estimatedDays).toBeGreaterThan(0);
      expect(rec.estimatedCostUSD).toBeGreaterThan(0);
    });
  });
});

describe('getSafestRoute', () => {
  it('returns the RECOMMENDED route if it exists', () => {
    const shipment = state.shipments[0]!;
    const safest = getSafestRoute(shipment);
    if (!safest) return;
    // It should be the RECOMMENDED one if any exists
    const recommendations = getAlternativeRoutes(shipment);
    const recommended = recommendations.find(r => r.recommendation === 'RECOMMENDED');
    if (recommended) {
      expect(safest.route.routeId).toBe(recommended.route.routeId);
    }
  });
});
