// ============================================================
// SupplyGuard AI — Scenario Engine
// ============================================================
import type { DemoScenario } from '../shared/types';
import { state, resetState } from '../data/index';
import { getReadingsForShipment } from '../data/iotReadings';

/**
 * Returns the currently active scenario, or null if none is active.
 */
export function getActiveScenario(): DemoScenario | null {
  if (!state.activeScenarioId) return null;
  return state.scenarios.find(s => s.scenarioId === state.activeScenarioId) ?? null;
}

/**
 * Resets all data state to defaults (clears any active scenario).
 */
export function resetToDefault(): void {
  resetState();
  console.log('[ScenarioEngine] All data reset to default state.');
}

/**
 * Activates a scenario by ID:
 * 1. Resets to default state first
 * 2. Activates specified disruptions
 * 3. Marks affected shipments as AT_RISK or DELAYED
 * 4. Sets affected carrier(s) to REDUCED_CAPACITY if applicable
 * 5. Triggers cold chain IoT events if applicable
 * 6. Records the active scenario ID
 */
export function activateScenario(scenarioId: string): {
  success: boolean;
  message: string;
  scenario?: DemoScenario;
} {
  const scenario = state.scenarios.find(s => s.scenarioId === scenarioId);
  if (!scenario) {
    return { success: false, message: `Scenario ${scenarioId} not found.` };
  }

  // Start from clean default state
  resetState();

  // ── Step 1: Activate disruptions ──────────────────────────
  for (const disruptionId of scenario.activateDisruptions) {
    const idx = state.disruptions.findIndex(d => d.id === disruptionId);
    const existing = state.disruptions[idx];
    if (idx !== -1 && existing) {
      state.disruptions[idx] = { ...existing, status: 'ACTIVE' };
    }
  }

  // ── Step 2: Mark affected shipments ───────────────────────
  for (const shipmentId of scenario.affectedShipments) {
    const idx = state.shipments.findIndex(s => s.shipmentId === shipmentId);
    const shipment = state.shipments[idx];
    if (idx !== -1 && shipment) {
      // Only affect non-delivered shipments
      if (shipment.status === 'DELIVERED') continue;

      // Escalate status: IN_TRANSIT → DELAYED, already AT_RISK stays AT_RISK
      if (shipment.status === 'IN_TRANSIT' || shipment.status === 'PENDING') {
        const scenarioDisruptions = scenario.activateDisruptions
          .map(id => state.disruptions.find(d => d.id === id))
          .filter((d): d is NonNullable<typeof d> => d !== undefined);

        const onAffectedRoute = scenarioDisruptions.some(d =>
          d.affectedRoutes.includes(shipment.routeId)
        );
        const carrierAffected = scenarioDisruptions.some(d =>
          d.affectedCarriers?.includes(shipment.carrierId) ?? false
        );

        if (onAffectedRoute || carrierAffected) {
          state.shipments[idx] = {
            ...shipment,
            status: 'AT_RISK',
            delayHours: Math.max(
              shipment.delayHours,
              scenarioDisruptions.reduce(
                (maxVal, d) => Math.max(maxVal, d.estimatedDelayHours ?? 0),
                0
              )
            ),
          };
        } else {
          state.shipments[idx] = {
            ...shipment,
            status: 'DELAYED',
            delayHours: Math.max(shipment.delayHours, 24),
          };
        }
      }
    }
  }

  // ── Step 3: Carrier capacity adjustments ──────────────────
  if (scenario.activateDisruptions.includes('DIS-005')) {
    const carrierIdx = state.carriers.findIndex(c => c.carrierId === 'CAR-001');
    const existingCarrier = state.carriers[carrierIdx];
    if (carrierIdx !== -1 && existingCarrier) {
      state.carriers[carrierIdx] = {
        ...existingCarrier,
        status: 'REDUCED_CAPACITY',
        availableCapacity: Math.round(existingCarrier.totalCapacity * 0.2),
      };
    }
  }

  // ── Step 4: Cold chain events ──────────────────────────────
  if (scenario.triggerColdChainEvents && scenario.coldChainShipments) {
    for (const shipmentId of scenario.coldChainShipments) {
      const idx = state.shipments.findIndex(s => s.shipmentId === shipmentId);
      const ccShipment = state.shipments[idx];
      if (idx !== -1 && ccShipment && ccShipment.status !== 'DELIVERED') {
        if (ccShipment.status === 'IN_TRANSIT') {
          state.shipments[idx] = { ...ccShipment, status: 'AT_RISK' };
        }
      }
    }
  }

  // ── Step 5: Record active scenario ────────────────────────
  state.activeScenarioId = scenarioId;
  state.lastUpdated = new Date().toISOString();

  return {
    success: true,
    message:
      `Scenario "${scenario.name}" activated. ` +
      `${scenario.activateDisruptions.length} disruption(s) activated. ` +
      `${scenario.affectedShipments.length} shipment(s) affected.`,
    scenario,
  };
}

/**
 * Returns a list of all available scenarios with summary info.
 */
export function listScenarios(): Array<{
  scenarioId: string;
  name: string;
  description: string;
  isActive: boolean;
}> {
  return state.scenarios.map(s => ({
    scenarioId: s.scenarioId,
    name: s.name,
    description: s.description,
    isActive: s.scenarioId === state.activeScenarioId,
  }));
}
