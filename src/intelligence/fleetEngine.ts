// ============================================================
// SupplyGuard AI — Fleet Intelligence Engine
// ============================================================
import type { FleetAsset, FleetRedeployment, Priority, Shipment } from '../shared/types';
import { state } from '../data/index';
import { getAffectedShipments } from './shipmentRiskEngine';

/**
 * Returns all IDLE or AVAILABLE fleet assets.
 */
export function getIdleAssets(): FleetAsset[] {
  return state.fleetAssets.filter(
    a => a.status === 'IDLE' || a.status === 'AVAILABLE'
  );
}

/**
 * Calculates how many hours an asset has been idle since lastActivity.
 */
export function calculateIdleDuration(asset: FleetAsset): number {
  const lastActivity = new Date(asset.lastActivity);
  const now = new Date();
  const diffMs = now.getTime() - lastActivity.getTime();
  return Math.round(diffMs / (1000 * 60 * 60) * 10) / 10;
}

/**
 * Estimates transit hours from an asset's current location to a destination.
 * Uses a simplified great-circle approximation (km / avg speed).
 */
function estimateTransitHours(
  fromLat: number, fromLng: number,
  toLat: number, toLng: number,
  type: FleetAsset['type']
): number {
  // Approximate great-circle distance using equirectangular
  const R = 6371; // km
  const dLat = ((toLat - fromLat) * Math.PI) / 180;
  const dLng = ((toLng - fromLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((fromLat * Math.PI) / 180) *
      Math.cos((toLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const distanceKm = 2 * R * Math.asin(Math.sqrt(a));

  // Average speeds: truck = 80 km/h, container vessel = 740 km/day ~= 31 km/h, vessel = 925 km/day ~= 38 km/h
  const speedKmh = type === 'TRUCK' ? 80 : type === 'CONTAINER' ? 31 : 38;
  return Math.round((distanceKm / speedKmh) * 10) / 10;
}

/**
 * Recommends the best redeployment for an idle asset.
 * Matches asset type (cold-capable, capacity) to highest-risk affected shipments.
 */
export function recommendRedeployment(
  asset: FleetAsset,
  affectedShipments?: Array<{ shipment: Shipment; riskScore: { overallScore: number; estimatedDelayHours: number } }>
): FleetRedeployment | null {
  const candidates = affectedShipments ?? getAffectedShipments();

  // Filter to shipments that match this asset's capabilities
  const compatible = candidates.filter(({ shipment }) => {
    // Cold-capable required for cold-chain
    if (shipment.isColdChain && !asset.isColdCapable) return false;
    // Asset type compatibility (rough match)
    if (asset.type === 'TRUCK' && shipment.weightKg > 28000) return false;
    // Not already assigned
    if (asset.assignedShipmentId === shipment.shipmentId) return false;
    return true;
  });

  if (compatible.length === 0) return null;

  // Sort by risk score descending, then by proximity to asset
  const ranked = compatible
    .map(({ shipment, riskScore }) => {
      const transitHours = estimateTransitHours(
        asset.currentLocation.lat,
        asset.currentLocation.lng,
        shipment.currentLocation.lat,
        shipment.currentLocation.lng,
        asset.type
      );
      return { shipment, riskScore, transitHours };
    })
    .sort((a, b) => {
      // Prioritize risk, but prefer nearby assets for equal risk
      const riskDiff = b.riskScore.overallScore - a.riskScore.overallScore;
      if (Math.abs(riskDiff) >= 10) return riskDiff;
      return a.transitHours - b.transitHours;
    });

  if (!ranked[0]) return null;
  const best = ranked[0];
  const idleHours = calculateIdleDuration(asset);
  const estimatedBenefitHours = Math.max(
    0,
    best.riskScore.estimatedDelayHours - best.transitHours
  );

  const priority: Priority =
    best.riskScore.overallScore >= 75
      ? 'CRITICAL'
      : best.riskScore.overallScore >= 55
        ? 'HIGH'
        : best.riskScore.overallScore >= 30
          ? 'MEDIUM'
          : 'LOW';

  return {
    asset,
    targetShipmentId: best.shipment.shipmentId,
    currentLocation: asset.currentLocation,
    targetLocation: best.shipment.currentLocation,
    transitHours: best.transitHours,
    estimatedBenefitHours,
    reasoning:
      `${asset.name} has been idle for ${idleHours}h in ${asset.currentLocation.name}. ` +
      `Shipment ${best.shipment.shipmentId} (${best.shipment.cargoDescription.split('—').at(0)!.trim()}) ` +
      `has a risk score of ${best.riskScore.overallScore}/100 with ${best.riskScore.estimatedDelayHours}h estimated delay. ` +
      `Asset can reach shipment in ~${best.transitHours}h, potentially saving ~${estimatedBenefitHours}h of delay.`,
    priority,
  };
}

/**
 * Returns redeployment recommendations for all idle assets.
 */
export function getAllRedeploymentRecommendations(): FleetRedeployment[] {
  const idleAssets = getIdleAssets();
  const affectedShipments = getAffectedShipments();

  return idleAssets
    .map(asset => recommendRedeployment(asset, affectedShipments))
    .filter((r): r is FleetRedeployment => r !== null)
    .sort((a, b) => {
      const priorityOrder: Record<Priority, number> = {
        CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3,
      };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}

/**
 * Mutates the fleet asset state to mark an asset as assigned to a shipment.
 * Returns a confirmation string.
 */
export function redeployAsset(assetId: string, shipmentId: string): string {
  const assetIdx = state.fleetAssets.findIndex(a => a.assetId === assetId);
  if (assetIdx === -1) {
    return `ERROR: Asset ${assetId} not found.`;
  }

  const shipment = state.shipments.find(s => s.shipmentId === shipmentId);
  if (!shipment) {
    return `ERROR: Shipment ${shipmentId} not found.`;
  }

  const existing = state.fleetAssets[assetIdx]!;
  const updated: FleetAsset = {
    ...existing,
    status: 'ASSIGNED',
    assignedShipmentId: shipmentId,
    lastActivity: new Date().toISOString(),
  };
  state.fleetAssets[assetIdx] = updated;

  return (
    `CONFIRMED: Asset ${assetId} (${updated.name}) ` +
    `redeployed to shipment ${shipmentId} (${shipment.cargoDescription.split('—').at(0)!.trim()}). ` +
    `Status updated to ASSIGNED.`
  );
}
