# SupplyGuard AI — Source Code

## Structure

```
src/
  backend/      — Express REST API (Node.js/TypeScript) — port 3001
  frontend/     — React dashboard (Vite/TypeScript/Tailwind CSS) — port 5173
  intelligence/ — Business logic engines (pure TypeScript, no external dependencies)
  mcp/          — IBM Bob MCP server (10 tools, StdioServerTransport)
  data/         — Synthetic datasets and scenario definitions
  shared/       — Shared TypeScript types and interfaces
  tests/        — Jest test suite (115 tests, 9 suites)
  .env.example  — Environment variable template
```

---

## Quick Start

You need two terminals:

```bash
# Terminal 1 — Backend (port 3001)
cd src/backend
npm install
npm run dev

# Terminal 2 — Frontend (port 5173)
cd src/frontend
npm install
npm run dev
```

Open **http://localhost:5173**

No API keys or external services required — the app runs entirely on in-memory synthetic data.

---

## Development

### Backend

```bash
cd src/backend
npm run dev        # ts-node hot-reload
npm run build      # compile to dist/
npm start          # run compiled output
```

Entry point: `src/backend/src/index.ts`
Routes: `src/backend/src/routes/`

### Frontend

```bash
cd src/frontend
npm run dev        # Vite dev server with HMR
npm run build      # Production build to dist/
npm run preview    # Preview production build
```

Entry point: `src/frontend/src/main.tsx`
Pages: `src/frontend/src/pages/`
Components: `src/frontend/src/components/`

### Intelligence Engines

The engines are pure TypeScript modules with no runtime dependencies. They import shared state from `src/data/index.ts` and export functions used by both the REST API and the MCP server.

```
src/intelligence/
  disruptionEngine.ts      — Active disruption queries and severity filtering
  shipmentRiskEngine.ts    — Composite 0–100 risk scoring with per-factor breakdown
  routeEngine.ts           — Alternative route ranking
  carrierEngine.ts         — Alternative carrier ranking
  fleetEngine.ts           — Idle asset detection and redeployment recommendations
  coldChainEngine.ts       — IoT excursion detection and severity classification
  operationsBrief.ts       — Aggregated supply chain health brief
  scenarioEngine.ts        — Scenario activation/deactivation
  copilotEngine.ts         — Rule-based copilot response generator
  index.ts                 — Barrel export
```

### MCP Server

```bash
cd src/mcp
npm install
npm run build      # compile to dist/ (required before using with Bob)
npm run dev        # run with ts-node (development only)
```

Entry point: `src/mcp/src/index.ts`
Transport: `StdioServerTransport` — Bob spawns this as a child process.

See `docs/setup-guide.md` for Bob configuration instructions.

---

## Testing

```bash
cd src/tests
npm install
npm test
```

Expected output:
```
Test Suites: 9 passed, 9 total
Tests:       115 passed, 115 total
```

Test files:
```
src/tests/
  disruptionEngine.test.ts
  shipmentRiskEngine.test.ts
  routeEngine.test.ts
  carrierEngine.test.ts
  fleetEngine.test.ts
  coldChainEngine.test.ts
  scenarioEngine.test.ts
  copilotEngine.test.ts
  api.test.ts
```

---

## Data

All demo data lives in `src/data/` as TypeScript modules. No database required.

| File | Contents |
|---|---|
| `shipments.ts` | 50 shipments with origin, destination, carrier, cargo, deadline |
| `disruptions.ts` | 20 disruptions with severity, type, affected route IDs, delay estimate |
| `fleet.ts` | 30 fleet assets (trucks, containers, vessels) with status and location |
| `carriers.ts` | 10 carriers with reliability scores, capacity, and lane coverage |
| `routes.ts` | 20 trade routes with distance, cost, and disruption-overlap fields |
| `iotReadings.ts` | 500+ temperature readings across refrigerated shipments |
| `scenarios.ts` | 5 scenario definitions, each referencing a set of disruption IDs |
| `index.ts` | Singleton state module — shared source of truth for all engines |

To reset state (e.g., deactivate all scenarios), restart the backend server.

---

## IBM Bob MCP Tools

The MCP server exposes 10 tools to Bob:

| Tool | Engine |
|---|---|
| `get_active_disruptions` | `disruptionEngine` |
| `get_affected_shipments` | `shipmentRiskEngine` |
| `analyze_shipment_risk` | `shipmentRiskEngine` |
| `recommend_routes` | `routeEngine` |
| `recommend_carriers` | `carrierEngine` |
| `get_idle_fleet` | `fleetEngine` |
| `recommend_fleet_redeployment` | `fleetEngine` |
| `get_cold_chain_alerts` | `coldChainEngine` |
| `analyze_temperature_excursion` | `coldChainEngine` |
| `generate_operations_brief` | `operationsBrief` |

Add to Bob's MCP config:
```json
{
  "mcpServers": {
    "supplyguard": {
      "command": "node",
      "args": ["/absolute/path/to/bob-ai-hackathon-team-phoenix/src/mcp/dist/index.js"],
      "transport": "stdio"
    }
  }
}
```
