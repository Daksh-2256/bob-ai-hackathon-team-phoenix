// ============================================================
// SupplyGuard AI — Fleet Route
// ============================================================
import { Router, Request, Response } from 'express';
import { state } from '../../../data/index';
import {
  calculateIdleDuration,
  getIdleAssets,
  recommendRedeployment,
  redeployAsset,
} from '../../../intelligence/fleetEngine';
import { getAffectedShipments } from '../../../intelligence/shipmentRiskEngine';
import { z } from 'zod';

const router = Router();

// GET /api/fleet
router.get('/fleet', (_req: Request, res: Response) => {
  try {
    const assets = state.fleetAssets.map(asset => ({
      ...asset,
      idleDurationHours:
        asset.status === 'IDLE' || asset.status === 'AVAILABLE'
          ? calculateIdleDuration(asset)
          : 0,
    }));

    const summary = {
      total: assets.length,
      inTransit: assets.filter(a => a.status === 'IN_TRANSIT').length,
      idle: assets.filter(a => a.status === 'IDLE').length,
      maintenance: assets.filter(a => a.status === 'MAINTENANCE').length,
      available: assets.filter(a => a.status === 'AVAILABLE').length,
      assigned: assets.filter(a => a.status === 'ASSIGNED').length,
    };

    res.json({ success: true, count: assets.length, summary, data: assets });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch fleet assets' });
  }
});

// GET /api/fleet/idle
router.get('/fleet/idle', (_req: Request, res: Response) => {
  try {
    const idleAssets = getIdleAssets();
    const affectedShipments = getAffectedShipments();

    const idleWithRecommendations = idleAssets.map(asset => ({
      ...asset,
      idleDurationHours: calculateIdleDuration(asset),
      redeploymentRecommendation: recommendRedeployment(asset, affectedShipments),
    }));

    res.json({
      success: true,
      count: idleWithRecommendations.length,
      data: idleWithRecommendations,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch idle fleet assets' });
  }
});

// POST /api/fleet/redeploy
const redeploySchema = z.object({
  assetId: z.string().min(1),
  shipmentId: z.string().min(1),
});

router.post('/fleet/redeploy', (req: Request, res: Response) => {
  try {
    const parsed = redeploySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: parsed.error.flatten(),
      });
      return;
    }

    const { assetId, shipmentId } = parsed.data;

    const asset = state.fleetAssets.find(a => a.assetId === assetId);
    if (!asset) {
      res.status(404).json({ success: false, error: `Asset ${assetId} not found` });
      return;
    }
    const shipment = state.shipments.find(s => s.shipmentId === shipmentId);
    if (!shipment) {
      res.status(404).json({ success: false, error: `Shipment ${shipmentId} not found` });
      return;
    }

    const confirmation = redeployAsset(assetId, shipmentId);

    if (confirmation.startsWith('ERROR')) {
      res.status(400).json({ success: false, error: confirmation });
      return;
    }

    // Fetch the updated asset after redeployment mutation
    const updatedAsset = state.fleetAssets.find(a => a.assetId === assetId);
    const recommendation = recommendRedeployment(asset, getAffectedShipments());

    res.json({
      success: true,
      data: {
        confirmation,
        updatedAsset,
        updatedShipment: shipment,
        estimatedBenefit: recommendation?.estimatedBenefitHours ?? 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to redeploy asset' });
  }
});

export default router;
