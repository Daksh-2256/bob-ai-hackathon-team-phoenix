// ============================================================
// SupplyGuard AI — Carriers Route
// ============================================================
import { Router, Request, Response } from 'express';
import { state } from '../../../data/index';
import { scoreCarrier } from '../../../intelligence/carrierEngine';
import { getDisruptionsForCarrier } from '../../../intelligence/disruptionEngine';

const router = Router();

// GET /api/carriers
router.get('/carriers', (_req: Request, res: Response) => {
  try {
    const carriers = state.carriers.map(carrier => ({
      ...carrier,
      compositeScore: scoreCarrier(carrier),
      activeDisruptions: getDisruptionsForCarrier(carrier.carrierId),
      capacityUtilizationPct:
        carrier.totalCapacity > 0
          ? Math.round(
              ((carrier.totalCapacity - carrier.availableCapacity) / carrier.totalCapacity) * 100
            )
          : 0,
    }));

    // Sort by composite score descending
    carriers.sort((a, b) => b.compositeScore - a.compositeScore);

    res.json({ success: true, count: carriers.length, data: carriers });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch carriers' });
  }
});

export default router;
