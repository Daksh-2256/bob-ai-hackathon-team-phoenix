// ============================================================
// SupplyGuard AI — Express Backend Server
// ============================================================
import express from 'express';
import cors from 'cors';

import dashboardRouter from './routes/dashboard';
import disruptionsRouter from './routes/disruptions';
import shipmentsRouter from './routes/shipments';
import carriersRouter from './routes/carriers';
import fleetRouter from './routes/fleet';
import coldChainRouter from './routes/coldChain';
import copilotRouter from './routes/copilot';
import operationsRouter from './routes/operations';
import scenariosRouter from './routes/scenarios';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env['PORT'] ? parseInt(process.env['PORT'], 10) : 3001;

// ── Middleware ────────────────────────────────────────────────
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  })
);
app.use(express.json());

// ── Health check ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// ── API routes ────────────────────────────────────────────────
app.use('/api', dashboardRouter);
app.use('/api', disruptionsRouter);
app.use('/api', shipmentsRouter);
app.use('/api', carriersRouter);
app.use('/api', fleetRouter);
app.use('/api', coldChainRouter);
app.use('/api', copilotRouter);
app.use('/api', operationsRouter);
app.use('/api', scenariosRouter);

// ── 404 handler ───────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────
app.use(errorHandler);

// ── Start server ──────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[SupplyGuard AI] Backend running on http://localhost:${PORT}`);
});

export default app;
