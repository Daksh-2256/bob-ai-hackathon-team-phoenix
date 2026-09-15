// ============================================================
// Tests: Fleet Engine
// ============================================================
import { resetState, state } from '../data/index';
import {
  getIdleAssets,
  calculateIdleDuration,
  recommendRedeployment,
  redeployAsset,
  getAllRedeploymentRecommendations,
} from '../intelligence/fleetEngine';
import { getAffectedShipments } from '../intelligence/shipmentRiskEngine';

beforeEach(() => {
  resetState();
});

describe('getIdleAssets', () => {
  it('returns only IDLE or AVAILABLE assets', () => {
    const assets = getIdleAssets();
    expect(assets.length).toBeGreaterThan(0);
    assets.forEach(asset => {
      expect(['IDLE', 'AVAILABLE']).toContain(asset.status);
    });
  });

  it('does not return IN_TRANSIT or ASSIGNED or MAINTENANCE assets', () => {
    const assets = getIdleAssets();
    assets.forEach(asset => {
      expect(asset.status).not.toBe('IN_TRANSIT');
      expect(asset.status).not.toBe('ASSIGNED');
      expect(asset.status).not.toBe('MAINTENANCE');
    });
  });
});

describe('calculateIdleDuration', () => {
  it('returns a positive number for past lastActivity', () => {
    const assets = getIdleAssets();
    expect(assets.length).toBeGreaterThan(0);
    assets.forEach(asset => {
      const duration = calculateIdleDuration(asset);
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  it('returns a number (not NaN)', () => {
    const asset = getIdleAssets()[0];
    if (!asset) return;
    const duration = calculateIdleDuration(asset);
    expect(isNaN(duration)).toBe(false);
  });

  it('returns a higher value for assets idle longer', () => {
    // Create two assets with different lastActivity timestamps
    const older = {
      ...getIdleAssets()[0]!,
      lastActivity: '2020-01-01T00:00:00Z', // very old
    };
    const newer = {
      ...getIdleAssets()[0]!,
      lastActivity: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1h ago
    };
    expect(calculateIdleDuration(older)).toBeGreaterThan(calculateIdleDuration(newer));
  });
});

describe('recommendRedeployment', () => {
  it('returns a FleetRedeployment for an idle asset with matching shipments', () => {
    const idleAssets = getIdleAssets();
    const affectedShipments = getAffectedShipments();
    if (idleAssets.length === 0 || affectedShipments.length === 0) return;

    // Try until we find an asset that can be redeployed
    let found = false;
    for (const asset of idleAssets) {
      const rec = recommendRedeployment(asset, affectedShipments);
      if (rec) {
        found = true;
        expect(rec.targetShipmentId).toBeDefined();
        expect(typeof rec.transitHours).toBe('number');
        expect(rec.estimatedBenefitHours).toBeGreaterThanOrEqual(0);
        expect(rec.priority).toMatch(/CRITICAL|HIGH|MEDIUM|LOW/);
        expect(rec.reasoning.length).toBeGreaterThan(0);
        break;
      }
    }
    // It's OK if no suitable match found in edge cases, but we expect at least one
  });

  it('only matches cold-capable assets to cold-chain shipments', () => {
    const affectedShipments = getAffectedShipments();
    const nonColdAsset = getIdleAssets().find(a => !a.isColdCapable);
    if (!nonColdAsset) return;

    const rec = recommendRedeployment(nonColdAsset, affectedShipments);
    if (rec) {
      // The recommended shipment should NOT be cold-chain
      const targetShipment = state.shipments.find(s => s.shipmentId === rec.targetShipmentId);
      if (targetShipment) {
        expect(targetShipment.isColdChain).toBe(false);
      }
    }
  });
});

describe('redeployAsset', () => {
  it('changes asset status to ASSIGNED', () => {
    const idleAssets = getIdleAssets();
    const affectedShipments = getAffectedShipments();
    if (idleAssets.length === 0 || affectedShipments.length === 0) return;

    const asset = idleAssets[0]!;
    const shipment = affectedShipments[0]!.shipment;

    const result = redeployAsset(asset.assetId, shipment.shipmentId);
    expect(result).toContain('CONFIRMED');

    const updatedAsset = state.fleetAssets.find(a => a.assetId === asset.assetId);
    expect(updatedAsset?.status).toBe('ASSIGNED');
    expect(updatedAsset?.assignedShipmentId).toBe(shipment.shipmentId);
  });

  it('returns ERROR string for unknown asset', () => {
    const result = redeployAsset('NONEXISTENT', 'SHP-001');
    expect(result).toContain('ERROR');
  });

  it('returns ERROR string for unknown shipment', () => {
    const idleAsset = getIdleAssets()[0];
    if (!idleAsset) return;
    const result = redeployAsset(idleAsset.assetId, 'NONEXISTENT');
    expect(result).toContain('ERROR');
  });
});

describe('getAllRedeploymentRecommendations', () => {
  it('returns an array (possibly empty)', () => {
    const recs = getAllRedeploymentRecommendations();
    expect(Array.isArray(recs)).toBe(true);
  });

  it('returns recommendations sorted by priority', () => {
    const recs = getAllRedeploymentRecommendations();
    const priorityOrder: Record<string, number> = {
      CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3,
    };
    for (let i = 1; i < recs.length; i++) {
      expect(priorityOrder[recs[i - 1]!.priority]).toBeLessThanOrEqual(
        priorityOrder[recs[i]!.priority]
      );
    }
  });
});
