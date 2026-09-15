// ============================================================
// Tests: Shipment Risk Engine
// ============================================================
import { resetState, state } from '../data/index';
import {
  analyzeShipmentRisk,
  getRiskLevel,
  getAffectedShipments,
  getHighestRiskShipment,
  getTotalCargoValueAtRisk,
} from '../intelligence/shipmentRiskEngine';
import { getActiveDisruptions } from '../intelligence/disruptionEngine';

beforeEach(() => {
  resetState();
});

describe('getRiskLevel', () => {
  it('maps score 0-29 to LOW', () => {
    expect(getRiskLevel(0)).toBe('LOW');
    expect(getRiskLevel(15)).toBe('LOW');
    expect(getRiskLevel(29)).toBe('LOW');
  });

  it('maps score 30-54 to MEDIUM', () => {
    expect(getRiskLevel(30)).toBe('MEDIUM');
    expect(getRiskLevel(40)).toBe('MEDIUM');
    expect(getRiskLevel(54)).toBe('MEDIUM');
  });

  it('maps score 55-74 to HIGH', () => {
    expect(getRiskLevel(55)).toBe('HIGH');
    expect(getRiskLevel(65)).toBe('HIGH');
    expect(getRiskLevel(74)).toBe('HIGH');
  });

  it('maps score 75+ to CRITICAL', () => {
    expect(getRiskLevel(75)).toBe('CRITICAL');
    expect(getRiskLevel(90)).toBe('CRITICAL');
    expect(getRiskLevel(100)).toBe('CRITICAL');
  });
});

describe('analyzeShipmentRisk', () => {
  it('returns a score between 0 and 100', () => {
    const activeDisruptions = getActiveDisruptions();
    state.shipments.forEach(shipment => {
      const result = analyzeShipmentRisk(shipment, activeDisruptions);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });
  });

  it('returns a result with the correct shipmentId', () => {
    const shipment = state.shipments[0]!;
    const activeDisruptions = getActiveDisruptions();
    const result = analyzeShipmentRisk(shipment, activeDisruptions);
    expect(result.shipmentId).toBe(shipment.shipmentId);
  });

  it('returns a non-empty factors array', () => {
    const shipment = state.shipments[0]!;
    const activeDisruptions = getActiveDisruptions();
    const result = analyzeShipmentRisk(shipment, activeDisruptions);
    expect(result.factors.length).toBeGreaterThan(0);
  });

  it('cold-chain shipment gets higher cold chain factor score', () => {
    const coldShipment = state.shipments.find(s => s.isColdChain);
    const nonColdShipment = state.shipments.find(s => !s.isColdChain);
    if (!coldShipment || !nonColdShipment) return;

    const activeDisruptions = getActiveDisruptions();
    const coldResult = analyzeShipmentRisk(coldShipment, activeDisruptions);
    const nonColdResult = analyzeShipmentRisk(nonColdShipment, activeDisruptions);

    const coldFactor = coldResult.factors.find(f => f.factor === 'Cold Chain Sensitivity');
    const nonColdFactor = nonColdResult.factors.find(f => f.factor === 'Cold Chain Sensitivity');

    expect(coldFactor).toBeDefined();
    expect(nonColdFactor).toBeDefined();
    expect(coldFactor!.score).toBeGreaterThan(nonColdFactor!.score);
  });

  it('returns riskLevel consistent with overallScore', () => {
    const activeDisruptions = getActiveDisruptions();
    state.shipments.slice(0, 10).forEach(shipment => {
      const result = analyzeShipmentRisk(shipment, activeDisruptions);
      const expectedLevel = getRiskLevel(result.overallScore);
      expect(result.riskLevel).toBe(expectedLevel);
    });
  });

  it('calculates a weighted sum that matches overallScore', () => {
    const shipment = state.shipments[0]!;
    const activeDisruptions = getActiveDisruptions();
    const result = analyzeShipmentRisk(shipment, activeDisruptions);
    const weightedSum = Math.round(
      result.factors.reduce((sum, f) => sum + f.weight * f.score, 0)
    );
    expect(result.overallScore).toBe(weightedSum);
  });
});

describe('getAffectedShipments', () => {
  it('returns shipments with positive risk scores', () => {
    const results = getAffectedShipments();
    results.forEach(r => {
      expect(r.riskScore.overallScore).toBeGreaterThan(0);
    });
  });

  it('returns results sorted by overall score descending', () => {
    const results = getAffectedShipments();
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1]!.riskScore.overallScore).toBeGreaterThanOrEqual(
        results[i]!.riskScore.overallScore
      );
    }
  });

  it('does not include DELIVERED shipments', () => {
    const results = getAffectedShipments();
    results.forEach(r => {
      expect(r.shipment.status).not.toBe('DELIVERED');
    });
  });
});

describe('getHighestRiskShipment', () => {
  it('returns the shipment with the highest risk score', () => {
    const highest = getHighestRiskShipment();
    if (!highest) return;
    const all = getAffectedShipments();
    expect(highest.riskScore.overallScore).toBe(all[0]!.riskScore.overallScore);
  });
});

describe('getTotalCargoValueAtRisk', () => {
  it('returns a non-negative number', () => {
    const total = getTotalCargoValueAtRisk();
    expect(total).toBeGreaterThanOrEqual(0);
  });

  it('only counts shipments with score >= 55', () => {
    const results = getAffectedShipments();
    const expected = results
      .filter(r => r.riskScore.overallScore >= 55)
      .reduce((sum, r) => sum + r.shipment.cargoValueUSD, 0);
    const actual = getTotalCargoValueAtRisk();
    expect(actual).toBe(expected);
  });
});
