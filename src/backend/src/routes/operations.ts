// ============================================================
// SupplyGuard AI — Operations Brief Route
// ============================================================
import { Router, Request, Response } from 'express';
import { generateOperationsBrief } from '../../../intelligence/operationsBrief';

const router = Router();

// GET /api/operations-brief
router.get('/operations-brief', (_req: Request, res: Response) => {
  try {
    const brief = generateOperationsBrief();
    res.json({ success: true, data: brief });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to generate operations brief' });
  }
});

export default router;
