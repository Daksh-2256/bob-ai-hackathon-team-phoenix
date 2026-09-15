// ============================================================
// SupplyGuard AI — Cold Chain Intelligence Engine
// ============================================================
import type {
  ColdChainAnalysis,
  ExcursionEvent,
  ExcursionSeverity,
  IoTReading,
  TemperatureAlert,
} from '../shared/types'; // SensorStatus intentionally unused (used via IoTReading)
import { state } from '../data/index';
import { temperatureThresholds, excursionThresholds } from '../data/config/coldChainConfig';

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Retrieves the allowed temperature range for a cargo type.
 * Falls back to pharmaceutical defaults if not found.
 */
function getTempRange(cargoType: string): { min: number; max: number } {
  const key = cargoType.toUpperCase();
  const cfg = temperatureThresholds[key];
  if (cfg) return { min: cfg.minTempC, max: cfg.maxTempC };
  // Default: pharmaceutical 2–8°C
  return { min: 2, max: 8 };
}

// ─── Core engine functions ────────────────────────────────────

/**
 * Detects excursion events from a series of IoT readings.
 * An excursion is a contiguous run of readings outside [tempMin, tempMax].
 */
export function detectExcursions(
  readings: IoTReading[],
  tempMin: number,
  tempMax: number
): ExcursionEvent[] {
  const events: ExcursionEvent[] = [];
  let excursionStart: IoTReading | null = null;
  let excursionReadings: IoTReading[] = [];

  const sorted = [...readings].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (const reading of sorted) {
    const isOut = reading.temperature < tempMin || reading.temperature > tempMax;

    if (isOut) {
      if (!excursionStart) {
        excursionStart = reading;
        excursionReadings = [];
      }
      excursionReadings.push(reading);
    } else {
      // End of excursion
      if (excursionStart && excursionReadings.length > 0) {
        const lastR = excursionReadings[excursionReadings.length - 1]!;
        const durationMs =
          new Date(lastR.timestamp).getTime() -
          new Date(excursionStart.timestamp).getTime();
        const durationMinutes = Math.round(durationMs / 60000) + 30; // +30 for interval

        const temps = excursionReadings.map(r => r.temperature);
        const minTemp = Math.min(...temps);
        const maxTemp = Math.max(...temps);

        const deviation = Math.max(
          Math.abs(maxTemp - tempMax),
          Math.abs(minTemp - tempMin)
        );

        events.push({
          startTime: excursionStart.timestamp,
          endTime: lastR.timestamp,
          durationMinutes,
          minTemp: Math.round(minTemp * 10) / 10,
          maxTemp: Math.round(maxTemp * 10) / 10,
          maxDeviation: Math.round(deviation * 10) / 10,
          severity: classifySeverity(durationMinutes, deviation),
        });

        excursionStart = null;
        excursionReadings = [];
      }
    }
  }

  // Handle excursion still ongoing at end of readings
  if (excursionStart && excursionReadings.length > 0) {
    const lastReading = excursionReadings[excursionReadings.length - 1]!;
    const durationMs =
      new Date(lastReading.timestamp).getTime() -
      new Date(excursionStart.timestamp).getTime();
    const durationMinutes = Math.round(durationMs / 60000) + 30;
    const temps = excursionReadings.map(r => r.temperature);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const deviation = Math.max(Math.abs(maxTemp - tempMax), Math.abs(minTemp - tempMin));

    events.push({
      startTime: excursionStart.timestamp,
      endTime: lastReading.timestamp,
      durationMinutes,
      minTemp: Math.round(minTemp * 10) / 10,
      maxTemp: Math.round(maxTemp * 10) / 10,
      maxDeviation: Math.round(deviation * 10) / 10,
      severity: classifySeverity(durationMinutes, deviation),
    });
  }

  return events;
}

/**
 * Classifies excursion severity based on duration and temperature deviation.
 *
 * CRITICAL: duration >= 120 min OR deviation >= 5°C
 * MAJOR:    duration >= 60  min OR deviation >= 3°C
 * MINOR:    duration >= 15  min OR any deviation
 * NORMAL:   no excursion
 */
export function classifySeverity(
  excursionDurationMinutes: number,
  maxTempDeviation: number
): ExcursionSeverity {
  if (
    excursionDurationMinutes >= excursionThresholds.CRITICAL.durationMinutes ||
    maxTempDeviation >= 5
  ) {
    return 'CRITICAL';
  }
  if (
    excursionDurationMinutes >= excursionThresholds.MAJOR.durationMinutes ||
    maxTempDeviation >= 3
  ) {
    return 'MAJOR';
  }
  if (
    excursionDurationMinutes >= excursionThresholds.MINOR.durationMinutes ||
    maxTempDeviation > 0
  ) {
    return 'MINOR';
  }
  return 'NORMAL';
}

/**
 * Full cold chain analysis for a shipment.
 */
export function analyzeShipmentTemperature(shipmentId: string): ColdChainAnalysis | null {
  const shipment = state.shipments.find(s => s.shipmentId === shipmentId);
  if (!shipment || !shipment.isColdChain) return null;

  const readings = state.iotReadings.filter(r => r.shipmentId === shipmentId);
  if (readings.length === 0) return null;

  const tempMin = shipment.temperatureMin ?? 2;
  const tempMax = shipment.temperatureMax ?? 8;

  const excursions = detectExcursions(readings, tempMin, tempMax);

  // Time in range
  const inRangeCount = readings.filter(
    r => r.temperature >= tempMin && r.temperature <= tempMax
  ).length;
  const percentTimeInRange =
    readings.length > 0
      ? Math.round((inRangeCount / readings.length) * 100)
      : 100;

  // Overall severity = worst single excursion
  const overallSeverity: ExcursionSeverity =
    excursions.length === 0
      ? 'NORMAL'
      : (['CRITICAL', 'MAJOR', 'MINOR', 'NORMAL'] as ExcursionSeverity[]).find(level =>
          excursions.some(e => e.severity === level)
        ) ?? 'NORMAL';

  const maxDeviation =
    excursions.length > 0
      ? Math.max(...excursions.map(e => e.maxDeviation))
      : 0;

  // Recommendation
  let recommendation: string;
  switch (overallSeverity) {
    case 'CRITICAL':
      recommendation =
        'QUARANTINE CARGO IMMEDIATELY. Sustained temperature excursion exceeds critical threshold. ' +
        'Contact QA and consignee. Initiate stability assessment per ICH Q1A guidelines. ' +
        'Do not release cargo without QA approval.';
      break;
    case 'MAJOR':
      recommendation =
        'ALERT: Major excursion detected. Notify logistics coordinator and consignee. ' +
        'Assess product viability. Document deviation for regulatory records. ' +
        'Consider sample testing at destination.';
      break;
    case 'MINOR':
      recommendation =
        'Minor excursion on record. Continue monitoring closely. Document in shipment record. ' +
        'Notify receiving QA team at destination. Likely within product stability budget.';
      break;
    default:
      recommendation =
        'Temperature profile within specification throughout transit. ' +
        'Cold chain integrity maintained. Standard release process applicable.';
  }

  return {
    shipmentId,
    cargoType: shipment.cargoType,
    allowedMin: tempMin,
    allowedMax: tempMax,
    totalReadings: readings.length,
    excursions,
    overallSeverity,
    percentTimeInRange,
    maxDeviation,
    recommendation,
  };
}

/**
 * Returns temperature alerts for all cold-chain shipments that have excursions.
 */
export function getActiveAlerts(): TemperatureAlert[] {
  const coldShipments = state.shipments.filter(
    s => s.isColdChain && s.status !== 'DELIVERED'
  );
  const alerts: TemperatureAlert[] = [];

  for (const shipment of coldShipments) {
    const analysis = analyzeShipmentTemperature(shipment.shipmentId);
    if (!analysis || analysis.overallSeverity === 'NORMAL') continue;

    const latestReading = state.iotReadings
      .filter(r => r.shipmentId === shipment.shipmentId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    if (!latestReading) continue;

    const latestExcursion = analysis.excursions[analysis.excursions.length - 1];
    const deviation = latestReading
      ? Math.max(
          0,
          Math.max(
            latestReading.temperature - analysis.allowedMax,
            analysis.allowedMin - latestReading.temperature
          )
        )
      : 0;

    const worstDeviation = analysis.maxDeviation;

    alerts.push({
      alertId: `ALT-${shipment.shipmentId}-${Date.now()}`,
      shipmentId: shipment.shipmentId,
      sensorId: latestReading.sensorId,
      detectedAt: latestExcursion?.startTime ?? latestReading.timestamp,
      currentTemp: latestReading.temperature,
      allowedMin: analysis.allowedMin,
      allowedMax: analysis.allowedMax,
      deviation: Math.round(worstDeviation * 10) / 10,
      severity: analysis.overallSeverity,
      excursionDurationMinutes: latestExcursion?.durationMinutes ?? 0,
      message:
        `${analysis.overallSeverity} excursion recorded on ${shipment.cargoDescription.split('—').at(0)!.trim()}. ` +
        `Worst deviation: ±${worstDeviation.toFixed(1)}°C from range ${analysis.allowedMin}–${analysis.allowedMax}°C. ` +
        `Duration: ${latestExcursion?.durationMinutes ?? 0}min.`,
      acknowledged: false,
    });
  }

  const severityOrder: Record<ExcursionSeverity, number> = {
    CRITICAL: 0, MAJOR: 1, MINOR: 2, NORMAL: 3,
  };
  return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}
