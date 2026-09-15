// ============================================================
// SupplyGuard AI — Copilot Route
// ============================================================
import { Router, Request, Response } from 'express';
import { processQuery } from '../../../intelligence/copilotEngine';
import { z } from 'zod';

const router = Router();

const querySchema = z.object({
  query: z.string().min(1, 'Query must be a non-empty string'),
});

// POST /api/copilot/query
router.post('/copilot/query', (req: Request, res: Response) => {
  try {
    const parsed = querySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: parsed.error.flatten(),
      });
      return;
    }

    const response = processQuery(parsed.data.query);

    res.json({
      success: true,
      data: {
        ...response,
        answer: response.naturalLanguageAnswer,
        confidence: 1.0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to process copilot query' });
  }
});

export default router;
