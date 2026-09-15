// ============================================================
// Tests: Cold Chain Engine
// ============================================================
import { resetState, state } from '../data/index';
import {
  detectExcursions,
  classifySeverity,
  analyzeShipmentTemperature,
  getActiveAlerts,
} from '../intelligence/coldChainEngine';
import type { IoTReading } from '../shared/types';

beforeEach(() => {
  resetState();
});

// ─── Helper ──────────────────────────────────────────────────
function makeReading(temp: number, minutesOffset: number = 0): IoTReading {
  return {
    readingId: `R-${minutesOffset}`,
    sensorId: 'SEN-TEST',
    shipmentId: 'SHP-TEST',
    timestamp: new Date(Date.now() + minutesOffset * 60000).toISOString(),
    temperature: temp,
    humidity: 60,
    location: { lat: 0, lng: 0, name: 'Test' },
    batteryPct: 100,
    sensorStatus: 'NORMAL',
  };
}

// ─── detectExcursions ────────────────────────────────────────
describe('detectExcursions', () => {
  it('returns empty array when all readings are in range', () => {
    const readings = [
      makeReading(5, 0),
      makeReading(5, 30),
      makeReading(5, 60),
    ];
    const excursions = detectExcursions(readings, 2, 8);
    expect(excursions).toHaveLength(0);
  });

  it('detects an excursion when readings go out of range', () => {
    const readings = [
      makeReading(5, 0),    // in range
      makeReading(12, 30),  // out of range - start
      makeReading(14, 60),  // out of range
      makeReading(5, 90),   // back in range - ends excursion
      makeReading(5, 120),  // in range
    ];
    const excursions = detectExcursions(readings, 2, 8);
    expect(excursions.length).toBeGreaterThan(0);
  });

  it('records correct min/max temp for excursion event', () => {
    const readings = [
      makeReading(5, 0),
      makeReading(15, 30),
      makeReading(20, 60),
      makeReading(5, 90),
    ];
    const excursions = detectExcursions(readings, 2, 8);
    expect(excursions.length).toBeGreaterThan(0);
    expect(excursions[0]!.maxTemp).toBeGreaterThanOrEqual(15);
  });

  it('handles multiple separate excursions', () => {
    const readings = [
      makeReading(5, 0),
      makeReading(15, 30),  // excursion 1
      makeReading(5, 60),
      makeReading(5, 90),
      makeReading(15, 120), // excursion 2
      makeReading(5, 150),
    ];
    const excursions = detectExcursions(readings, 2, 8);
    expect(excursions.length).toBeGreaterThanOrEqual(2);
  });

  it('handles ongoing excursion at end of readings', () => {
    const readings = [
      makeReading(5, 0),
      makeReading(15, 30),
      makeReading(15, 60), // still out of range — no in-range reading to close it
    ];
    const excursions = detectExcursions(readings, 2, 8);
    expect(excursions.length).toBe(1);
  });
});

// ─── classifySeverity ────────────────────────────────────────
describe('classifySeverity', () => {
  it('returns NORMAL for zero duration and zero deviation', () => {
    expect(classifySeverity(0, 0)).toBe('NORMAL');
  });

  it('returns MINOR for short excursions with small deviation', () => {
    // 15+ min OR any deviation > 0
    const result = classifySeverity(20, 1);
    expect(result).toBe('MINOR');
  });

  it('returns MAJOR for 60+ min excursion', () => {
    const result = classifySeverity(60, 1);
    expect(result).toBe('MAJOR');
  });

  it('returns MAJOR for 3°C+ deviation', () => {
    const result = classifySeverity(10, 3);
    expect(result).toBe('MAJOR');
  });

  it('returns CRITICAL for 120+ min excursion', () => {
    const result = classifySeverity(120, 1);
    expect(result).toBe('CRITICAL');
  });

  it('returns CRITICAL for 5°C+ deviation', () => {
    const result = classifySeverity(10, 5);
    expect(result).toBe('CRITICAL');
  });

  it('CRITICAL thresholds take precedence over MAJOR', () => {
    // Long duration + high deviation = CRITICAL
    expect(classifySeverity(150, 6)).toBe('CRITICAL');
  });
});

// ─── analyzeShipmentTemperature ──────────────────────────────
describe('analyzeShipmentTemperature', () => {
  it('returns null for non-cold-chain shipments', () => {
    const nonColdShipment = state.shipments.find(s => !s.isColdChain);
    if (!nonColdShipment) return;
    const result = analyzeShipmentTemperature(nonColdShipment.shipmentId);
    expect(result).toBeNull();
  });

  it('returns null for unknown shipment IDs', () => {
    const result = analyzeShipmentTemperature('NONEXISTENT');
    expect(result).toBeNull();
  });

  it('analyzes a vaccine shipment and returns a valid analysis', () => {
    const vaccineShipment = state.shipments.find(s => s.cargoType === 'VACCINES' && s.isColdChain);
    if (!vaccineShipment) return;

    const result = analyzeShipmentTemperature(vaccineShipment.shipmentId);
    if (!result) return; // No IoT readings yet for this shipment

    expect(result.shipmentId).toBe(vaccineShipment.shipmentId);
    expect(result.allowedMin).toBeDefined();
    expect(result.allowedMax).toBeDefined();
    expect(result.percentTimeInRange).toBeGreaterThanOrEqual(0);
    expect(result.percentTimeInRange).toBeLessThanOrEqual(100);
    expect(['NORMAL', 'MINOR', 'MAJOR', 'CRITICAL']).toContain(result.overallSeverity);
    expect(result.recommendation.length).toBeGreaterThan(0);
  });

  it('returns excursion events array for analyzed shipments', () => {
    const coldShipment = state.shipments.find(s => s.isColdChain);
    if (!coldShipment) return;
    const result = analyzeShipmentTemperature(coldShipment.shipmentId);
    if (!result) return;
    expect(Array.isArray(result.excursions)).toBe(true);
  });

  it('overallSeverity is the worst of all excursion severities', () => {
    const coldShipments = state.shipments.filter(s => s.isColdChain);
    for (const shipment of coldShipments) {
      const result = analyzeShipmentTemperature(shipment.shipmentId);
      if (!result || result.excursions.length === 0) continue;
      const severityOrder: Record<string, number> = {
        NORMAL: 0, MINOR: 1, MAJOR: 2, CRITICAL: 3,
      };
      const maxExcursionSeverity = result.excursions.reduce(
        (max, e) => Math.max(max, severityOrder[e.severity] ?? 0),
        0
      );
      const overallOrder = severityOrder[result.overallSeverity] ?? 0;
      expect(overallOrder).toBe(maxExcursionSeverity);
      break;
    }
  });
});

// ─── getActiveAlerts ─────────────────────────────────────────
describe('getActiveAlerts', () => {
  it('returns only alerts for cold-chain shipments', () => {
    const alerts = getActiveAlerts();
    alerts.forEach(alert => {
      const shipment = state.shipments.find(s => s.shipmentId === alert.shipmentId);
      expect(shipment).toBeDefined();
      expect(shipment?.isColdChain).toBe(true);
    });
  });

  it('returns alerts with severity that is not NORMAL', () => {
    const alerts = getActiveAlerts();
    alerts.forEach(alert => {
      expect(alert.severity).not.toBe('NORMAL');
    });
  });

  it('returns alerts sorted by severity (CRITICAL first)', () => {
    const alerts = getActiveAlerts();
    const severityOrder: Record<string, number> = {
      CRITICAL: 0, MAJOR: 1, MINOR: 2, NORMAL: 3,
    };
    for (let i = 1; i < alerts.length; i++) {
      expect(severityOrder[alerts[i - 1]!.severity]).toBeLessThanOrEqual(
        severityOrder[alerts[i]!.severity]
      );
    }
  });

  it('does not include alerts for DELIVERED shipments', () => {
    const alerts = getActiveAlerts();
    alerts.forEach(alert => {
      const shipment = state.shipments.find(s => s.shipmentId === alert.shipmentId);
      expect(shipment?.status).not.toBe('DELIVERED');
    });
  });
});
