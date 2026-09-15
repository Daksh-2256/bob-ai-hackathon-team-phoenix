// ============================================================
// Tests: Carrier Engine
// ============================================================
import { resetState, state } from '../data/index';
import {
  getAlternativeCarriers,
  scoreCarrier,
  rankCarriers,
  getBestCarrier,
} from '../intelligence/carrierEngine';

beforeEach(() => {
  resetState();
});

describe('scoreCarrier', () => {
  it('returns a score between 0 and 100', () => {
    state.carriers.forEach(carrier => {
      const score = scoreCarrier(carrier);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  it('gives bonus for carriers supporting the specified route', () => {
    const carrier = state.carriers.find(c => c.supportedRoutes.length > 0);
    if (!carrier) return;
    const routeId = carrier.supportedRoutes[0]!;
    const withRoute = scoreCarrier(carrier, routeId);
    const withoutRoute = scoreCarrier(carrier, 'NONEXISTENT');
    expect(withRoute).toBeGreaterThanOrEqual(withoutRoute);
  });
});

describe('getAlternativeCarriers', () => {
  it('returns at most 3 carriers', () => {
    const shipment = state.shipments[0]!;
    const recommendations = getAlternativeCarriers(shipment);
    expect(recommendations.length).toBeLessThanOrEqual(3);
  });

  it('returns carriers sorted by score descending', () => {
    const shipment = state.shipments[0]!;
    const recommendations = getAlternativeCarriers(shipment);
    for (let i = 1; i < recommendations.length; i++) {
      expect(recommendations[i - 1]!.score).toBeGreaterThanOrEqual(
        recommendations[i]!.score
      );
    }
  });

  it('excludes the current carrier of the shipment', () => {
    const shipment = state.shipments[0]!;
    const recommendations = getAlternativeCarriers(shipment);
    recommendations.forEach(rec => {
      expect(rec.carrier.carrierId).not.toBe(shipment.carrierId);
    });
  });

  it('does not include SUSPENDED carriers', () => {
    const shipment = state.shipments[0]!;
    const recommendations = getAlternativeCarriers(shipment);
    recommendations.forEach(rec => {
      expect(rec.carrier.status).not.toBe('SUSPENDED');
    });
  });

  it('each carrier recommendation has a reasoning string', () => {
    const shipment = state.shipments[0]!;
    const recommendations = getAlternativeCarriers(shipment);
    recommendations.forEach(rec => {
      expect(typeof rec.reasoning).toBe('string');
      expect(rec.reasoning.length).toBeGreaterThan(0);
    });
  });

  it('assigns sequential ranks starting from 1', () => {
    const shipment = state.shipments[0]!;
    const recommendations = getAlternativeCarriers(shipment);
    recommendations.forEach((rec, index) => {
      expect(rec.rank).toBe(index + 1);
    });
  });

  it('carriers with reduced capacity may be ranked lower or have cons listed', () => {
    const shipment = state.shipments[0]!;
    const recommendations = getAlternativeCarriers(shipment);
    const reducedCap = state.carriers.find(c => c.status === 'REDUCED_CAPACITY');
    if (!reducedCap) return;
    const reducedRec = recommendations.find(r => r.carrier.carrierId === reducedCap.carrierId);
    if (!reducedRec) return; // Not in top 3 — that also implies ranked lower
    // It should be ranked lower (rank 2 or 3) or have cons
    const activeRec = recommendations.find(r => r.carrier.status === 'ACTIVE');
    if (activeRec) {
      expect(activeRec.rank).toBeLessThanOrEqual(reducedRec.rank);
    }
  });
});

describe('rankCarriers', () => {
  it('excludes the specified carrierId', () => {
    const toExclude = state.carriers[0]!.carrierId;
    const ranked = rankCarriers(state.carriers, { excludeCarrierId: toExclude });
    ranked.forEach(c => {
      expect(c.carrierId).not.toBe(toExclude);
    });
  });

  it('excludes SUSPENDED carriers', () => {
    const ranked = rankCarriers(state.carriers, {});
    ranked.forEach(c => {
      expect(c.status).not.toBe('SUSPENDED');
    });
  });
});

describe('getBestCarrier', () => {
  it('returns the top-ranked recommendation', () => {
    const shipment = state.shipments[0]!;
    const best = getBestCarrier(shipment);
    if (!best) return;
    expect(best.rank).toBe(1);
  });
});
