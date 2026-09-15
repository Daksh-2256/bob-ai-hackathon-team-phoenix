// ============================================================
// Tests: Disruption Engine
// ============================================================
import { resetState } from '../data/index';
import {
  getActiveDisruptions,
  getAffectedRoutes,
  calculateDisruptionSeverityScore,
  getDisruptionsRankedBySeverity,
} from '../intelligence/disruptionEngine';
import { state } from '../data/index';

beforeEach(() => {
  resetState();
});

describe('getActiveDisruptions', () => {
  it('returns only disruptions with ACTIVE status', () => {
    const disruptions = getActiveDisruptions();
    expect(disruptions.length).toBeGreaterThan(0);
    disruptions.forEach(d => {
      expect(d.status).toBe('ACTIVE');
    });
  });

  it('does not include RESOLVED or MONITORING disruptions', () => {
    const disruptions = getActiveDisruptions();
    disruptions.forEach(d => {
      expect(d.status).not.toBe('RESOLVED');
      expect(d.status).not.toBe('MONITORING');
    });
  });
});

describe('getAffectedRoutes', () => {
  it('returns routes matching a disruption affectedRoutes list', () => {
    const activeDisruptions = getActiveDisruptions();
    expect(activeDisruptions.length).toBeGreaterThan(0);
    const dis = activeDisruptions[0]!;
    const routes = getAffectedRoutes(dis.id);
    // Every returned route should be in the disruption's affectedRoutes
    routes.forEach(route => {
      expect(dis.affectedRoutes).toContain(route.routeId);
    });
  });

  it('returns empty array for unknown disruption ID', () => {
    const routes = getAffectedRoutes('NONEXISTENT');
    expect(routes).toEqual([]);
  });

  it('returns routes that exist in the data', () => {
    const activeDisruptions = getActiveDisruptions();
    if (activeDisruptions.length === 0) return;
    const dis = activeDisruptions[0]!;
    const routes = getAffectedRoutes(dis.id);
    routes.forEach(route => {
      expect(route.routeId).toBeDefined();
      expect(route.name).toBeDefined();
    });
  });
});

describe('calculateDisruptionSeverityScore', () => {
  it('returns a score between 0 and 100', () => {
    const disruptions = state.disruptions;
    disruptions.forEach(d => {
      const score = calculateDisruptionSeverityScore(d);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  it('returns 0 for RESOLVED disruptions', () => {
    const resolved = state.disruptions.find(d => d.status === 'RESOLVED');
    if (!resolved) return; // No resolved disruptions in dataset — skip
    const score = calculateDisruptionSeverityScore(resolved);
    expect(score).toBe(0);
  });

  it('CRITICAL disruptions score higher than LOW disruptions', () => {
    const criticalDis = state.disruptions.find(d => d.severity === 'CRITICAL' && d.status === 'ACTIVE');
    const lowDis = state.disruptions.find(d => d.severity === 'LOW');
    if (!criticalDis || !lowDis) return;
    const criticalScore = calculateDisruptionSeverityScore(criticalDis);
    const lowScore = calculateDisruptionSeverityScore(lowDis);
    expect(criticalScore).toBeGreaterThan(lowScore);
  });

  it('returns integer score', () => {
    const disruptions = state.disruptions.filter(d => d.status !== 'RESOLVED');
    disruptions.forEach(d => {
      const score = calculateDisruptionSeverityScore(d);
      expect(Number.isInteger(score)).toBe(true);
    });
  });
});

describe('getDisruptionsRankedBySeverity', () => {
  it('returns disruptions sorted by score descending', () => {
    const ranked = getDisruptionsRankedBySeverity();
    expect(ranked.length).toBeGreaterThan(0);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1]!.score).toBeGreaterThanOrEqual(ranked[i]!.score);
    }
  });

  it('does not include RESOLVED disruptions', () => {
    const ranked = getDisruptionsRankedBySeverity();
    ranked.forEach(({ disruption }) => {
      expect(disruption.status).not.toBe('RESOLVED');
    });
  });
});
