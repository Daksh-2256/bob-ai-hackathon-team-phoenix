// ============================================================
// SupplyGuard AI — Disruptions Route
// ============================================================
import { Router, Request, Response } from 'express';
import { state } from '../../../data/index';
import { getAffectedShipments } from '../../../intelligence/shipmentRiskEngine';
import { getActiveDisruptions } from '../../../intelligence/disruptionEngine';
import type { DisruptionStatus, DisruptionSeverity, DisruptionType } from '../../../shared/types';

const router = Router();

// GET /api/disruptions
router.get('/disruptions', (req: Request, res: Response) => {
  try {
    let disruptions = state.disruptions;

    const { status, severity, type } = req.query as {
      status?: string;
      severity?: string;
      type?: string;
    };

    if (status) {
      disruptions = disruptions.filter(d => d.status === (status as DisruptionStatus));
    }
    if (severity) {
      disruptions = disruptions.filter(d => d.severity === (severity as DisruptionSeverity));
    }
    if (type) {
      disruptions = disruptions.filter(d => d.type === (type as DisruptionType));
    }

    res.json({ success: true, count: disruptions.length, data: disruptions });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch disruptions' });
  }
});

// GET /api/disruptions/:id
router.get('/disruptions/:id', (req: Request, res: Response) => {
  try {
    const disruption = state.disruptions.find(d => d.id === req.params['id']);
    if (!disruption) {
      res.status(404).json({ success: false, error: `Disruption ${req.params['id']} not found` });
      return;
    }

    // Affected shipments via risk engine
    const affectedResults = getAffectedShipments(getActiveDisruptions()).filter(
      r =>
        disruption.affectedRoutes.includes(r.shipment.routeId) ||
        (disruption.affectedCarriers?.includes(r.shipment.carrierId) ?? false)
    );

    const totalCargoValue = affectedResults.reduce(
      (sum, r) => sum + r.shipment.cargoValueUSD,
      0
    );

    const recommendedActions: string[] = [
      `Monitor all shipments on routes: ${disruption.affectedRoutes.join(', ')}`,
      `Contact carriers affected: ${(disruption.affectedCarriers ?? []).join(', ') || 'N/A'}`,
      'Evaluate alternative routes for high-priority shipments',
      'Activate contingency carriers if delay exceeds SLA',
    ];

    if (disruption.severity === 'CRITICAL') {
      recommendedActions.unshift('Escalate to crisis management team immediately');
    }

    res.json({
      success: true,
      data: {
        disruption,
        affectedShipments: affectedResults.map(r => ({
          ...r.shipment,
          riskScore: r.riskScore,
        })),
        estimatedImpact: {
          totalCargoValue,
          affectedShipmentCount: affectedResults.length,
        },
        recommendedActions,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch disruption details' });
  }
});

export default router;
