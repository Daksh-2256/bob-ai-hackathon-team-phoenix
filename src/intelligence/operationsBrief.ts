// ============================================================
// SupplyGuard AI — Operations Brief Engine
// ============================================================
import type {
  HealthStatus,
  OperationsBrief,
  RecommendedAction,
} from '../shared/types';
import { state } from '../data/index';
import { getActiveDisruptions } from './disruptionEngine';
import { getCriticalAndHighRiskShipments, getTotalCargoValueAtRisk } from './shipmentRiskEngine';
import { getActiveAlerts } from './coldChainEngine';
import { getAllRedeploymentRecommendations } from './fleetEngine';

/**
 * Calculates overall supply chain health as GREEN / AMBER / RED
 * and a numeric health score 0–100 (100 = fully healthy).
 */
function calculateHealthScore(): { status: HealthStatus; score: number } {
  const activeDisruptions = getActiveDisruptions();
  const criticalDisruptions = activeDisruptions.filter(d => d.severity === 'CRITICAL');
  const highDisruptions = activeDisruptions.filter(d => d.severity === 'HIGH');

  const atRiskShipments = state.shipments.filter(
    s => s.status === 'AT_RISK' || s.status === 'DELAYED'
  );
  const criticalShipments = state.shipments.filter(
    s => s.priority === 'CRITICAL' && s.status !== 'DELIVERED' && s.status !== 'IN_TRANSIT'
  );

  const coldAlerts = getActiveAlerts();
  const criticalAlerts = coldAlerts.filter(a => a.severity === 'CRITICAL');

  // Deductions from 100
  let score = 100;
  score -= criticalDisruptions.length * 20;
  score -= highDisruptions.length * 10;
  score -= Math.min(atRiskShipments.length * 3, 20);
  score -= criticalShipments.length * 8;
  score -= criticalAlerts.length * 12;

  score = Math.max(0, score);

  let status: HealthStatus;
  if (score >= 70) status = 'GREEN';
  else if (score >= 40) status = 'AMBER';
  else status = 'RED';

  return { status, score };
}

/**
 * Generates 5 prioritized recommended actions based on current supply chain state.
 */
function generateRecommendedActions(): RecommendedAction[] {
  const actions: RecommendedAction[] = [];
  const activeDisruptions = getActiveDisruptions();
  const riskResults = getCriticalAndHighRiskShipments();
  const coldAlerts = getActiveAlerts();
  const idleRedeployments = getAllRedeploymentRecommendations();

  // Action 1: Critical disruption response
  const criticalDisruptions = activeDisruptions.filter(d => d.severity === 'CRITICAL');
  const dis = criticalDisruptions[0];
  if (dis) {
    const affectedShipmentIds = riskResults
      .filter(r =>
        dis.affectedRoutes.includes(r.shipment.routeId) ||
        (dis.affectedCarriers?.includes(r.shipment.carrierId) ?? false)
      )
      .slice(0, 5)
      .map(r => r.shipment.shipmentId);

    actions.push({
      rank: 1,
      action: `Respond to CRITICAL disruption: ${dis.name}`,
      reason: dis.description.substring(0, 120) + '...',
      impactDescription:
        `${dis.affectedRoutes.length} routes affected. ` +
        `Est. ${dis.estimatedDelayHours ?? 'unknown'}h delay. ` +
        `Activate alternative carriers and reroute immediately.`,
      affectedShipments: affectedShipmentIds,
      urgency: 'CRITICAL',
    });
  }

  // Action 2: Critical cold chain excursions
  const criticalColdAlerts = coldAlerts.filter(a => a.severity === 'CRITICAL');
  if (criticalColdAlerts.length > 0) {
    actions.push({
      rank: actions.length + 1,
      action: `Emergency cold chain response: ${criticalColdAlerts.length} CRITICAL excursion(s)`,
      reason:
        `${criticalColdAlerts.length} shipment(s) have sustained temperature excursions exceeding critical threshold.`,
      impactDescription:
        `Cargo viability at risk. Quarantine and QA assessment required for: ` +
        criticalColdAlerts.map(a => a.shipmentId).join(', '),
      affectedShipments: criticalColdAlerts.map(a => a.shipmentId),
      urgency: 'CRITICAL',
    });
  }

  // Action 3: Reroute highest-risk shipment
  const topRisk = riskResults[0] ?? null;
  if (topRisk && topRisk.riskScore.overallScore >= 70) {
    actions.push({
      rank: actions.length + 1,
      action: `Reroute highest-risk shipment ${topRisk.shipment.shipmentId}`,
      reason:
        `${topRisk.shipment.cargoDescription.split('—').at(0)!.trim()} has risk score ` +
        `${topRisk.riskScore.overallScore}/100 (${topRisk.riskScore.riskLevel}).`,
      impactDescription:
        `Cargo value: $${(topRisk.shipment.cargoValueUSD / 1_000_000).toFixed(2)}M. ` +
        `Estimated delay: ${topRisk.riskScore.estimatedDelayHours}h. ` +
        `Find alternative route or carrier immediately.`,
      affectedShipments: [topRisk.shipment.shipmentId],
      urgency: 'CRITICAL',
    });
  }

  // Action 4: Fleet redeployment opportunity
  const topRedeploy = idleRedeployments[0] ?? null;
  if (topRedeploy) {
    actions.push({
      rank: actions.length + 1,
      action: `Redeploy idle ${topRedeploy.asset.type} ${topRedeploy.asset.assetId} to ${topRedeploy.targetShipmentId}`,
      reason:
        `${topRedeploy.asset.name} has been idle for ${Math.round((new Date().getTime() - new Date(topRedeploy.asset.lastActivity).getTime()) / 3600000)}h in ${topRedeploy.asset.currentLocation.name}.`,
      impactDescription:
        `Redeployment could reduce delay by ~${topRedeploy.estimatedBenefitHours}h on shipment ${topRedeploy.targetShipmentId}. ` +
        `Transit time to target: ${topRedeploy.transitHours}h.`,
      affectedShipments: [topRedeploy.targetShipmentId],
      urgency: topRedeploy.priority,
    });
  }

  // Action 5: Carrier capacity risk
  const reducedCapacityCarriers = state.carriers.filter(c => c.status === 'REDUCED_CAPACITY');
  const carrier = reducedCapacityCarriers[0] ?? null;
  if (carrier) {
    const affected = riskResults
      .filter(r => r.shipment.carrierId === carrier.carrierId)
      .map(r => r.shipment.shipmentId)
      .slice(0, 4);
    actions.push({
      rank: actions.length + 1,
      action: `Replace ${carrier.name} — operating at reduced capacity`,
      reason:
        `${carrier.name} is at reduced capacity (${carrier.notes?.substring(0, 80) ?? 'details unavailable'}).`,
      impactDescription:
        `${affected.length} bookings require reassignment. Contact alternative carriers immediately.`,
      affectedShipments: affected,
      urgency: 'HIGH',
    });
  }

  // Pad to 5 if needed
  if (actions.length < 5 && coldAlerts.length > 0) {
    const majorCold = coldAlerts.filter(a => a.severity === 'MAJOR');
    if (majorCold.length > 0) {
      actions.push({
        rank: actions.length + 1,
        action: `Monitor MAJOR cold chain deviations on ${majorCold.length} shipment(s)`,
        reason: `${majorCold.length} shipment(s) have MAJOR temperature excursions requiring consignee notification.`,
        impactDescription: `Notify receiving QA teams and document deviations for regulatory records.`,
        affectedShipments: majorCold.map(a => a.shipmentId),
        urgency: 'HIGH',
      });
    }
  }

  return actions.slice(0, 5);
}

/**
 * Generates a full operations brief with supply chain health,
 * active disruptions, critical shipments, cold chain alerts,
 * idle fleet, and prioritized actions.
 */
export function generateOperationsBrief(): OperationsBrief {
  const { status: supplyChainHealth, score: healthScore } = calculateHealthScore();
  const activeDisruptions = getActiveDisruptions();
  const riskResults = getCriticalAndHighRiskShipments();
  const criticalShipments = riskResults
    .filter(r => r.riskScore.riskLevel === 'CRITICAL')
    .map(r => r.shipment);
  const coldChainAlerts = getActiveAlerts();
  const idleFleetOpportunities = getAllRedeploymentRecommendations().slice(0, 5);
  const totalCargoValueAtRisk = getTotalCargoValueAtRisk();
  const recommendedActions = generateRecommendedActions();

  const delaysDetected = state.shipments.filter(
    s => s.delayHours > 0 && s.status !== 'DELIVERED'
  ).length;

  const shipmentsAtRisk = riskResults.filter(
    r => r.riskScore.riskLevel === 'HIGH' || r.riskScore.riskLevel === 'CRITICAL'
  ).length;

  const summary =
    `Supply chain health: ${supplyChainHealth} (${healthScore}/100). ` +
    `${activeDisruptions.length} active disruption(s). ` +
    `${shipmentsAtRisk} shipment(s) at HIGH/CRITICAL risk. ` +
    `$${(totalCargoValueAtRisk / 1_000_000).toFixed(1)}M cargo value at risk. ` +
    `${coldChainAlerts.length} cold chain alert(s). ` +
    `${idleFleetOpportunities.length} fleet redeployment opportunit(y/ies).`;

  const expectedImpact =
    recommendedActions.length > 0
      ? `Executing all ${recommendedActions.length} recommended actions could reduce delay exposure by ` +
        `${idleFleetOpportunities.reduce((s, r) => s + r.estimatedBenefitHours, 0)}h ` +
        `and protect $${(totalCargoValueAtRisk / 1_000_000).toFixed(1)}M in cargo value.`
      : 'No immediate actions required. Continue standard monitoring.';

  return {
    generatedAt: new Date().toISOString(),
    supplyChainHealth,
    healthScore,
    summary,
    activeDisruptions,
    criticalShipments,
    totalCargoValueAtRiskUSD: totalCargoValueAtRisk,
    coldChainAlerts,
    idleFleetOpportunities,
    recommendedActions,
    expectedImpact,
    shipmentsAtRisk,
    delaysDetected,
  };
}
