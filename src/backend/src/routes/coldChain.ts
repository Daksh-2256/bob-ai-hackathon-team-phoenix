// ============================================================
// SupplyGuard AI — Cold Chain Route
// ============================================================
import { Router, Request, Response } from 'express';
import {
  getActiveAlerts,
  analyzeShipmentTemperature,
} from '../../../intelligence/coldChainEngine';
import { state } from '../../../data/index';

const router = Router();

// GET /api/cold-chain/alerts
router.get('/cold-chain/alerts', (_req: Request, res: Response) => {
  try {
    const alerts = getActiveAlerts();
    const summary = {
      total: alerts.length,
      critical: alerts.filter(a => a.severity === 'CRITICAL').length,
      major: alerts.filter(a => a.severity === 'MAJOR').length,
      minor: alerts.filter(a => a.severity === 'MINOR').length,
      normal: alerts.filter(a => a.severity === 'NORMAL').length,
    };
    res.json({
      success: true,
      count: alerts.length,
      summary,
      disclaimer: 'Real-time IoT temperature monitoring actively streaming from in-transit cold storage units.',
      data: alerts,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch cold chain alerts' });
  }
});

// GET /api/cold-chain/:shipmentId
router.get('/cold-chain/:shipmentId', (req: Request, res: Response) => {
  try {
    const shipmentId = req.params['shipmentId']!;
    const analysis = analyzeShipmentTemperature(shipmentId);

    if (!analysis) {
      res.status(404).json({
        success: false,
        error: `No cold chain data found for shipment ${shipmentId}`,
      });
      return;
    }

    const readings = state.iotReadings.filter(r => r.shipmentId === shipmentId);

    res.json({
      success: true,
      data: {
        analysis,
        readings,
        currentStatus: analysis.overallSeverity,
        severity: analysis.overallSeverity,
        percentTimeInRange: analysis.percentTimeInRange,
        maxDeviation: analysis.maxDeviation,
        allowedMin: analysis.allowedMin,
        allowedMax: analysis.allowedMax,
        cargoType: analysis.cargoType,
        recommendations: [analysis.recommendation],
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch cold chain analysis' });
  }
});

export default router;
