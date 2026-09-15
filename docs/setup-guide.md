# Setup Guide

> **This file is read by the automated evaluation pipeline. Be precise and complete.**

## Prerequisites

Before you begin, ensure you have the following installed:

- [ ] **Node.js 18+** (Node.js 20 LTS recommended — [nodejs.org](https://nodejs.org))
- [ ] **npm 9+** (bundled with Node.js 20 LTS)
- [ ] No paid API keys required — the app runs entirely on synthetic demo data
- [ ] **IBM Bob** (optional, only needed to use the MCP Copilot integration)

Check your versions:

```bash
node --version   # expect v18.x or higher
npm --version    # expect 9.x or higher
```

---

## Environment Variables

The application runs without any environment configuration. To enable optional features, copy the template and fill in the relevant values:

```bash
cd bob-ai-hackathon-team-phoenix
cp src/.env.example src/backend/.env
cp src/.env.example src/frontend/.env
```

| Variable | Default | Required | Description |
|---|---|---|---|
| `PORT` | `3001` | No | Backend HTTP port |
| `NODE_ENV` | `development` | No | Runtime environment |
| `CORS_ORIGIN` | `http://localhost:5173` | No | Allowed frontend origin |
| `VITE_API_URL` | `http://localhost:3001` | No | Frontend API base URL |
| `WATSONX_API_KEY` | — | No | IBM watsonx.ai API key (enables enhanced NLG in Copilot) |
| `WATSONX_PROJECT_ID` | — | No | IBM watsonx.ai project ID |
| `WATSONX_URL` | `https://us-south.ml.cloud.ibm.com` | No | watsonx.ai endpoint |
| `WATSONX_MODEL_ID` | `ibm/granite-3-8b-instruct` | No | Model ID for Copilot |

**The application works fully without watsonx.ai credentials.** All intelligence engines run locally; the Copilot uses rule-based response generation when no watsonx credentials are provided.

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/[your-org]/bob-ai-hackathon-team-phoenix.git
cd bob-ai-hackathon-team-phoenix

# 2. Install backend dependencies
cd src/backend
npm install

# 3. Install frontend dependencies
cd ../frontend
npm install

# 4. Install MCP server dependencies (optional — only needed for IBM Bob integration)
cd ../mcp
npm install

# 5. Install test dependencies (optional — only needed to run the test suite)
cd ../tests
npm install
```

---

## Running the Application

You need **two terminals** — one for the backend, one for the frontend.

### Terminal 1 — Backend

```bash
cd bob-ai-hackathon-team-phoenix/src/backend
npm run dev
```

Expected output:
```
SupplyGuard AI Backend running on port 3001
```

The backend will be available at `http://localhost:3001`.

### Terminal 2 — Frontend

```bash
cd bob-ai-hackathon-team-phoenix/src/frontend
npm run dev
```

Expected output:
```
  VITE v5.x.x  ready in XXX ms
  ➜  Local:   http://localhost:5173/
```

**Open your browser at: `http://localhost:5173`**

---

## Running the MCP Server (IBM Bob Integration)

The MCP server is launched by IBM Bob as a child process — you do not run it manually. Instead, configure Bob to use it:

### Build the MCP server first

```bash
cd bob-ai-hackathon-team-phoenix/src/mcp
npm install
npm run build
```

### Add to Bob's MCP configuration

Add the following to your Bob MCP configuration file (typically `~/.bob/mcp.json` or through the Bob settings UI):

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

Replace `/absolute/path/to/` with the actual absolute path to the repository on your machine.

After adding the configuration, restart Bob. The 10 SupplyGuard tools will appear in Bob's tool list.

### Verify Bob integration

Ask Bob: *"What supply chain tools do you have available?"*

Bob should list: `get_active_disruptions`, `get_affected_shipments`, `analyze_shipment_risk`, `recommend_routes`, `recommend_carriers`, `get_idle_fleet`, `recommend_fleet_redeployment`, `get_cold_chain_alerts`, `analyze_temperature_excursion`, `generate_operations_brief`.

---

## Running Tests

```bash
cd bob-ai-hackathon-team-phoenix/src/tests
npm install  # if not already done
npm test
```

Expected output:
```
Test Suites: 9 passed, 9 total
Tests:       115 passed, 115 total
```

---

## Verification Steps

After starting both backend and frontend, confirm the following:

1. **Dashboard loads** at `http://localhost:5173` — you should see the KPI cards and navigation sidebar
2. **KPI cards show data** — Active Disruptions, Affected Shipments, Idle Assets, Cold Chain Alerts all show numbers
3. **Scenarios page works** — navigate to Scenarios, activate "Rotterdam Port Strike", return to Dashboard and confirm Active Disruptions count increased
4. **Shipment risk works** — click any shipment in the Shipments tab, confirm a risk score and breakdown appears
5. **Cold Chain page loads** — navigate to Cold Chain, confirm temperature alerts are listed
6. **Fleet Optimizer loads** — navigate to Fleet, confirm idle assets are listed with REDEPLOY buttons
7. **API responds directly** — visit `http://localhost:3001/api/disruptions` in the browser, confirm JSON response

---

## Troubleshooting

| Issue | Solution |
|---|---|
| `npm: command not found` | Install Node.js 18+ from [nodejs.org](https://nodejs.org) |
| `Error: EADDRINUSE :::3001` | Port 3001 is already in use. Set `PORT=3002` in `src/backend/.env` and update `VITE_API_URL=http://localhost:3002` in `src/frontend/.env` |
| `Error: EADDRINUSE :::5173` | Port 5173 is in use. Vite will automatically try the next available port (5174) — check the terminal output |
| Frontend shows "Failed to fetch" | Backend is not running. Start the backend in Terminal 1 first |
| `Cannot find module '../../data/index.js'` | You are trying to run a TypeScript file directly. Use `npm run dev` from the correct directory, not `node src/index.ts` |
| `tsc: command not found` | Run `npm install` inside the relevant package directory first |
| Bob shows no SupplyGuard tools | MCP server is not built or path is wrong. Run `npm run build` in `src/mcp/` and verify the absolute path in Bob's MCP config |
| Cold chain page shows no alerts | No scenarios are active. Navigate to Scenarios and activate one that includes cold-chain shipments (e.g., "Cold Chain Emergency") |
| Tests fail with `Cannot find module` | Run `npm install` inside `src/tests/` before running `npm test` |
