// ============================================================
// SupplyGuard AI — Express Backend Server
// ============================================================
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from root or local directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

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
import { connectDB, isDatabaseConnected } from './config/db';
import { seedDatabase, loadStateFromDB } from './services/dbSync';

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
  res.json({
    success: true,
    status: 'ok',
    database: isDatabaseConnected() ? 'connected' : 'in-memory (fallback)',
    timestamp: new Date().toISOString(),
  });
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

// ── Initialize Database & Start Server ────────────────────────
export async function startServer() {
  const dbConnected = await connectDB();
  if (dbConnected) {
    try {
      await seedDatabase(false);
      await loadStateFromDB();
    } catch (err: any) {
      console.error('[SupplyGuard AI] Database initialization error:', err.message);
    }
  }

  const server = app.listen(PORT, () => {
    console.log(`[SupplyGuard AI] Backend running on http://localhost:${PORT}`);
    console.log(
      `[SupplyGuard AI] Data persistence: ${isDatabaseConnected() ? 'MongoDB' : 'In-Memory State (zero-config mode)'}`
    );
  });

  return server;
}

if (process.env['NODE_ENV'] !== 'test') {
  startServer();
}

export default app;
