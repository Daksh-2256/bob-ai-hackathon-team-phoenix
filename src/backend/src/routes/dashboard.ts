// ============================================================
// SupplyGuard AI — Dashboard Route
// ============================================================
import { Router, Request, Response } from 'express';
import { state } from '../../../data/index';
import { getActiveDisruptions } from '../../../intelligence/disruptionEngine';
import {
  analyzeShipmentRisk,
  getAffectedShipments,
  getTotalCargoValueAtRisk,
} from '../../../intelligence/shipmentRiskEngine';
import { getActiveAlerts } from '../../../intelligence/coldChainEngine';
import { getIdleAssets } from '../../../intelligence/fleetEngine';

const router = Router();

router.get('/dashboard', (_req: Request, res: Response) => {
  try {
    const activeDisruptions = getActiveDisruptions();
    const disruptions = activeDisruptions;

    const activeShipments = state.shipments.filter(s => s.status !== 'DELIVERED');
    const activeDisruptionsList = getActiveDisruptions();
    const affectedResults = getAffectedShipments(activeDisruptionsList);

    const atRiskShipments = affectedResults.filter(
      r => r.riskScore.riskLevel === 'HIGH' || r.riskScore.riskLevel === 'CRITICAL'
    );

    const idleFleetAssets = getIdleAssets();
    const coldChainAlerts = getActiveAlerts();
    const cargoValueAtRisk = getTotalCargoValueAtRisk();

    // Average delay across active shipments
    const delayedShipments = activeShipments.filter(s => s.delayHours > 0);
    const averageDelayHours =
      delayedShipments.length > 0
        ? Math.round(
            delayedShipments.reduce((sum, s) => sum + s.delayHours, 0) /
              delayedShipments.length
          )
        : 0;

    // System health
    let systemHealth: 'GREEN' | 'AMBER' | 'RED';
    if (activeDisruptions.filter(d => d.severity === 'CRITICAL').length > 0) {
      systemHealth = 'RED';
    } else if (
      activeDisruptions.length > 0 ||
      atRiskShipments.length > 2 ||
      coldChainAlerts.filter(a => a.severity === 'CRITICAL').length > 0
    ) {
      systemHealth = 'AMBER';
    } else {
      systemHealth = 'GREEN';
    }

    // Recent alerts: last 5 cold chain alerts + first 5 disruptions merged
    const recentAlerts = coldChainAlerts.slice(0, 5).map(a => ({
      type: 'COLD_CHAIN',
      id: a.alertId,
      message: a.message,
      severity: a.severity,
      shipmentId: a.shipmentId,
      detectedAt: a.detectedAt,
    }));

    // Critical shipments: top 5 by risk score
    const criticalShipments = affectedResults.slice(0, 5).map(r => ({
      ...r.shipment,
      riskScore: r.riskScore,
    }));

    res.json({
      success: true,
      data: {
        activeDisruptions: disruptions.length,
        atRiskShipments: atRiskShipments.length,
        idleFleetAssets: idleFleetAssets.length,
        coldChainAlerts: coldChainAlerts.length,
        cargoValueAtRisk,
        averageDelayHours,
        systemHealth,
        recentAlerts,
        disruptionList: disruptions,
        criticalShipments,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to generate dashboard data' });
  }
});

export default router;
