// ============================================================
// SupplyGuard AI — Scenarios Route
// ============================================================
import { Router, Request, Response } from 'express';
import {
  listScenarios,
  activateScenario,
  resetToDefault,
} from '../../../intelligence/scenarioEngine';
import { state } from '../../../data/index';

const router = Router();

// GET /api/scenarios
router.get('/scenarios', (_req: Request, res: Response) => {
  try {
    const scenarios = listScenarios();
    res.json({ success: true, count: scenarios.length, data: scenarios });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch scenarios' });
  }
});

// POST /api/scenarios/:id/activate
router.post('/scenarios/:id/activate', (req: Request, res: Response) => {
  try {
    const scenarioId = req.params['id']!;
    const result = activateScenario(scenarioId);

    if (!result.success) {
      res.status(404).json({ success: false, error: result.message });
      return;
    }

    const scenario = result.scenario!;

    // Count state changes
    const disruptionsActivated = scenario.activateDisruptions.length;
    const shipmentsAffected = state.shipments.filter(
      s =>
        scenario.affectedShipments.includes(s.shipmentId) &&
        (s.status === 'AT_RISK' || s.status === 'DELAYED')
    ).length;

    res.json({
      success: true,
      data: {
        success: result.success,
        message: result.message,
        scenario,
        changes: {
          disruptionsActivated,
          shipmentsAffected,
          assetsRedeployed: 0, // scenario activation does not redeploy assets automatically
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to activate scenario' });
  }
});

// POST /api/scenarios/reset
router.post('/scenarios/reset', (_req: Request, res: Response) => {
  try {
    resetToDefault();
    res.json({ success: true, data: { message: 'State reset to default' } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to reset state' });
  }
});

export default router;
