// ============================================================
// Tests: Scenario Engine
// ============================================================
import { resetState, state } from '../data/index';
import {
  activateScenario,
  resetToDefault,
  getActiveScenario,
  listScenarios,
} from '../intelligence/scenarioEngine';

beforeEach(() => {
  resetState();
});

describe('activateScenario', () => {
  it('returns success=false for unknown scenario ID', () => {
    const result = activateScenario('NONEXISTENT');
    expect(result.success).toBe(false);
    expect(result.message).toContain('not found');
  });

  it('activates scenario SCN-001 (Rotterdam Port Strike)', () => {
    const result = activateScenario('SCN-001');
    expect(result.success).toBe(true);
    expect(result.scenario).toBeDefined();
    expect(result.scenario?.scenarioId).toBe('SCN-001');
  });

  it('activates DIS-001 when SCN-001 is activated', () => {
    activateScenario('SCN-001');
    const dis001 = state.disruptions.find(d => d.id === 'DIS-001');
    expect(dis001?.status).toBe('ACTIVE');
  });

  it('marks affected shipments as AT_RISK or DELAYED after scenario activation', () => {
    const scenario = state.scenarios.find(s => s.scenarioId === 'SCN-001');
    if (!scenario) return;
    activateScenario('SCN-001');
    for (const shipmentId of scenario.affectedShipments) {
      const shipment = state.shipments.find(s => s.shipmentId === shipmentId);
      if (!shipment || shipment.status === 'DELIVERED') continue;
      expect(['AT_RISK', 'DELAYED', 'DELIVERED']).toContain(shipment.status);
    }
  });

  it('sets activeScenarioId on state', () => {
    activateScenario('SCN-001');
    expect(state.activeScenarioId).toBe('SCN-001');
  });

  it('activates SCN-002 without error', () => {
    const result = activateScenario('SCN-002');
    expect(result.success).toBe(true);
  });
});

describe('resetToDefault', () => {
  it('clears activeScenarioId after reset', () => {
    activateScenario('SCN-001');
    expect(state.activeScenarioId).toBe('SCN-001');
    resetToDefault();
    expect(state.activeScenarioId).toBeNull();
  });

  it('restores original shipment statuses after reset', () => {
    const originalStatuses = state.shipments.map(s => ({
      id: s.shipmentId,
      status: s.status,
    }));
    activateScenario('SCN-001');
    resetToDefault();
    state.shipments.forEach(shipment => {
      const original = originalStatuses.find(o => o.id === shipment.shipmentId);
      if (original) {
        expect(shipment.status).toBe(original.status);
      }
    });
  });

  it('restores original disruption statuses after reset', () => {
    activateScenario('SCN-001');
    resetToDefault();
    // After reset, DIS-001 should be back to its original status
    const dis001 = state.disruptions.find(d => d.id === 'DIS-001');
    // DIS-001 is ACTIVE in the original dataset
    expect(dis001?.status).toBe('ACTIVE');
  });
});

describe('getActiveScenario', () => {
  it('returns null when no scenario is active', () => {
    const scenario = getActiveScenario();
    expect(scenario).toBeNull();
  });

  it('returns the active scenario after activation', () => {
    activateScenario('SCN-001');
    const scenario = getActiveScenario();
    expect(scenario).not.toBeNull();
    expect(scenario?.scenarioId).toBe('SCN-001');
  });
});

describe('listScenarios', () => {
  it('returns a list of all scenarios', () => {
    const scenarios = listScenarios();
    expect(scenarios.length).toBeGreaterThan(0);
  });

  it('marks the active scenario as isActive=true', () => {
    activateScenario('SCN-001');
    const scenarios = listScenarios();
    const active = scenarios.find(s => s.scenarioId === 'SCN-001');
    expect(active?.isActive).toBe(true);
  });

  it('marks inactive scenarios as isActive=false', () => {
    activateScenario('SCN-001');
    const scenarios = listScenarios();
    const inactive = scenarios.filter(s => s.scenarioId !== 'SCN-001');
    inactive.forEach(s => {
      expect(s.isActive).toBe(false);
    });
  });
});
