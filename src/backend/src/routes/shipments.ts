// ============================================================
// SupplyGuard AI — Shipments Route
// ============================================================
import { Router, Request, Response } from 'express';
import { state } from '../../../data/index';
import {
  analyzeShipmentRisk,
  getAffectedShipments,
} from '../../../intelligence/shipmentRiskEngine';
import { getActiveDisruptions } from '../../../intelligence/disruptionEngine';
import { getAlternativeRoutes } from '../../../intelligence/routeEngine';
import { getAlternativeCarriers } from '../../../intelligence/carrierEngine';
import type { RiskLevel, Priority, ShipmentStatus } from '../../../shared/types';

const router = Router();

// GET /api/shipments
router.get('/shipments', (req: Request, res: Response) => {
  try {
    const { risk, priority, carrier, status, isColdChain, search } = req.query as {
      risk?: string;
      priority?: string;
      carrier?: string;
      status?: string;
      isColdChain?: string;
      search?: string;
    };

    const activeDisruptions = getActiveDisruptions();
    let results = state.shipments.map(shipment => ({
      ...shipment,
      riskScore: analyzeShipmentRisk(shipment, activeDisruptions),
    }));

    if (risk) {
      results = results.filter(r => r.riskScore.riskLevel === (risk as RiskLevel));
    }
    if (priority) {
      results = results.filter(r => r.priority === (priority as Priority));
    }
    if (carrier) {
      results = results.filter(r => r.carrierId === carrier);
    }
    if (status) {
      results = results.filter(r => r.status === (status as ShipmentStatus));
    }
    if (isColdChain !== undefined) {
      const bool = isColdChain === 'true';
      results = results.filter(r => r.isColdChain === bool);
    }
    if (search) {
      const q = search.toLowerCase();
      results = results.filter(
        r =>
          r.shipmentId.toLowerCase().includes(q) ||
          r.cargoDescription.toLowerCase().includes(q) ||
          r.origin.name.toLowerCase().includes(q) ||
          r.destination.name.toLowerCase().includes(q)
      );
    }

    // Sort by risk score descending
    results.sort((a, b) => b.riskScore.overallScore - a.riskScore.overallScore);

    res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch shipments' });
  }
});

// GET /api/shipments/:id
router.get('/shipments/:id', (req: Request, res: Response) => {
  try {
    const shipment = state.shipments.find(s => s.shipmentId === req.params['id']);
    if (!shipment) {
      res.status(404).json({ success: false, error: `Shipment ${req.params['id']} not found` });
      return;
    }

    const activeDisruptions = getActiveDisruptions();
    const riskScore = analyzeShipmentRisk(shipment, activeDisruptions);

    res.json({ success: true, data: { ...shipment, riskScore } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch shipment' });
  }
});

// GET /api/shipments/:id/risk
router.get('/shipments/:id/risk', (req: Request, res: Response) => {
  try {
    const shipment = state.shipments.find(s => s.shipmentId === req.params['id']);
    if (!shipment) {
      res.status(404).json({ success: false, error: `Shipment ${req.params['id']} not found` });
      return;
    }

    const activeDisruptions = getActiveDisruptions();
    const riskScore = analyzeShipmentRisk(shipment, activeDisruptions);

    res.json({
      success: true,
      data: {
        shipmentId: riskScore.shipmentId,
        score: riskScore.overallScore,
        level: riskScore.riskLevel,
        reasons: riskScore.reasons,
        estimatedDelay: riskScore.estimatedDelayHours,
        cargoValueAtRisk: riskScore.cargoValueAtRisk,
        coldChainRisk: shipment.isColdChain
          ? riskScore.factors.find(f => f.factor === 'Cold Chain Sensitivity')
          : null,
        factors: riskScore.factors,
        calculatedAt: riskScore.calculatedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to compute risk analysis' });
  }
});

// GET /api/shipments/:id/routes
router.get('/shipments/:id/routes', (req: Request, res: Response) => {
  try {
    const shipment = state.shipments.find(s => s.shipmentId === req.params['id']);
    if (!shipment) {
      res.status(404).json({ success: false, error: `Shipment ${req.params['id']} not found` });
      return;
    }

    const recommendations = getAlternativeRoutes(shipment);
    res.json({ success: true, count: recommendations.length, data: recommendations });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to compute route recommendations' });
  }
});

// GET /api/shipments/:id/carriers
router.get('/shipments/:id/carriers', (req: Request, res: Response) => {
  try {
    const shipment = state.shipments.find(s => s.shipmentId === req.params['id']);
    if (!shipment) {
      res.status(404).json({ success: false, error: `Shipment ${req.params['id']} not found` });
      return;
    }

    const recommendations = getAlternativeCarriers(shipment);
    res.json({ success: true, count: recommendations.length, data: recommendations });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to compute carrier recommendations' });
  }
});

export default router;
