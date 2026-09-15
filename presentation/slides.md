# SupplyGuard AI — Presentation Outline

**IBM Bob AI Innovation Hackathon 2026 — Track: AI — Team Phoenix**

---

## Slide 1 — Title

**SupplyGuard AI**
*Intelligent Logistics Control Tower*

IBM Bob AI Innovation Hackathon 2026
Track: AI
Team: Phoenix

> *"From reactive firefighting to proactive supply chain intelligence"*

---

## Slide 2 — The Problem

**Supply chain disruptions are inevitable. The chaos that follows doesn't have to be.**

Three converging crises facing logistics operations teams today:

**1. Disruption Blindness**
When a port closes or a weather event hits, operations teams open spreadsheets and start sending emails. There is no tool that tells them *which* of their 50+ active shipments are actually affected, how severely, or what to do next.

**2. Fleet Waste**
Industry data: 20–30% of fleet assets are idle at any given time. Operations teams have no consolidated view of idle trucks, containers, and vessels — and no tool to match them against high-priority affected shipments.

**3. Cold-Chain Failure After Delivery**
Temperature excursions in pharmaceutical, food, and specialty cargo are typically discovered at delivery — when the cargo is already compromised, the regulatory filing is mandatory, and the liability has already accrued.

**The cost:**
- Supply chain disruptions: average $100M/year for Fortune 500 companies
- Global cold chain failures: $35B annual loss
- Manual disruption response: 4–6 hours of coordination per incident

---

## Slide 3 — Why Existing Approaches Fall Short

| What teams use today | Why it fails |
|---|---|
| TMS / ERP systems | Show shipment status, not disruption impact correlation |
| Spreadsheet tracking | No real-time update, no automated risk scoring |
| Weather / news feeds | Raw data with no link to affected shipments |
| Cold chain loggers | Data retrieved post-delivery, not monitored in flight |
| BI dashboards | Visualise past data; no recommendations for current state |

**The gap:** No tool correlates disruptions → specific affected shipments → prioritised recommendations → conversational AI access — in a single unified interface.

---

## Slide 4 — Our Solution

**SupplyGuard AI** is an intelligent logistics control tower.

It correlates active disruptions with shipment routes to compute live risk scores, surfaces ranked recommendations for routes, carriers, and fleet redeployment, monitors cold-chain IoT sensor streams to detect excursions before delivery, and makes every intelligence capability accessible to IBM Bob via a 10-tool MCP server.

**One interface. All your supply chain intelligence. Conversational.**

> Ask Bob: *"Give me the top 5 actions I should take right now"*
> Bob calls the operations brief engine, reads live state, and tells you exactly what to do.

---

## Slide 5 — How It Works

```
Operator opens SupplyGuard Dashboard
           │
           ▼
    Activates a Scenario
    (e.g., Rotterdam Port Strike)
           │
           ▼
    Disruption Engine marks
    affected disruptions active
           │
           ▼
    Shipment Risk Engine rescores
    all 50 shipments (0–100)
    with per-factor breakdown
           │
    ┌──────┴──────┐
    ▼             ▼
Route Engine   Fleet Engine
Alternative    Idle asset
routes ranked  redeployment
               recommendations
    │
    ▼
Cold Chain Engine
monitors 500+ IoT readings
classifies excursion severity
    │
    ▼
Operations Brief aggregates
all signals → health score
+ prioritised actions
    │
    ▼
IBM Bob Copilot (via MCP)
answers natural-language
questions from live state
```

---

## Slide 6 — Disruption Intelligence + Shipment Risk Scoring

**Disruption Intelligence**
- 20 pre-seeded disruptions: port strikes, weather, geopolitical, carrier failures
- 5 activatable demo scenarios
- Each disruption carries: severity, affected route IDs, estimated delay

**Shipment Risk Scoring — not just "affected yes/no"**

Risk score (0–100) = weighted sum of 4 factors:

| Factor | What it measures |
|---|---|
| `DISRUPTION_OVERLAP` | Does this shipment's route cross an active disruption zone? |
| `CARRIER_RELIABILITY` | Historical on-time performance of assigned carrier |
| `HIGH_VALUE_CARGO` | Cargo value relative to fleet exposure |
| `TIGHT_DEADLINE` | Proximity of delivery deadline |

Every score surfaces the top reason labels — operators see *why* a shipment is critical, not just that it is.

**Route & Carrier Recommendations**
- Ranked alternatives scored on: cost delta, delay days, disruption exposure, carrier reliability
- Best option auto-badged `RECOMMENDED`

---

## Slide 7 — Fleet Optimisation

**The Problem:** 20–30% of a typical logistics fleet sits idle while critical shipments are delayed.

**What SupplyGuard does:**
1. Scans 30 fleet assets (trucks, containers, vessels) for idle status
2. For each idle asset, calculates:
   - Cost of continued idling per day
   - Geographic proximity to high-risk affected shipments
   - Benefit score if redeployed
3. Returns ranked `REDEPLOY` recommendations with specific target shipment and estimated saving

**Result:** Operators can redeploy an idle truck to a critical shipment in 2 clicks, with a quantified benefit — not just a suggestion.

---

## Slide 8 — Cold Chain Intelligence

**The Problem:** Temperature excursions discovered at delivery are too late.

**What SupplyGuard does:**
- Ingests 500+ IoT temperature readings across refrigerated shipments
- Detects excursion *windows* (not just single readings) by measuring:
  - Duration of time outside the acceptable range
  - Maximum deviation above/below the limit
- Classifies excursion severity using regulatory-aligned thresholds:

| Severity | Criteria |
|---|---|
| `NORMAL` | All readings within range |
| `MINOR` | Deviation < 2 °C AND duration < 30 min |
| `MAJOR` | Deviation 2–5 °C OR duration 30–120 min |
| `CRITICAL` | Deviation > 5 °C OR duration > 120 min |

- Renders a time-series temperature chart with excursion windows annotated
- Surfaces alerts per shipment before delivery

**This is temporal analysis, not threshold alerting.** A single brief spike does not trigger a CRITICAL alert — matching how quality managers and regulators actually evaluate excursions.

---

## Slide 9 — IBM Bob MCP Integration

**10 load-bearing MCP tools — every intelligence engine accessible to Bob**

```
IBM Bob ──(stdio)──► SupplyGuard MCP Server
                      │
                      ├── get_active_disruptions
                      ├── get_affected_shipments
                      ├── analyze_shipment_risk        ← calls same function
                      ├── recommend_routes               as the REST API
                      ├── recommend_carriers
                      ├── get_idle_fleet
                      ├── recommend_fleet_redeployment
                      ├── get_cold_chain_alerts
                      ├── analyze_temperature_excursion
                      └── generate_operations_brief
```

**What makes this real, not demo-ware:**
- Every tool calls the actual TypeScript intelligence engine function
- Bob reads live application state — if you activate a scenario first, Bob's answers change
- No hardcoded responses, no separate MCP data layer
- Transport: `StdioServerTransport` — Bob spawns the MCP server as a child process, no extra network port

**Example prompts:**
- *"Which shipments are most affected by active disruptions?"*
- *"Show me idle trucks that can be redeployed"*
- *"Why is SHP-003 flagged as critical?"*
- *"Which cold-chain shipments have temperature excursions?"*
- *"Give me the top 5 actions I should take right now"*

---

## Slide 10 — Architecture

```
┌─────────────────────────────────────────────┐
│           Logistics Operator                │
└──────────┬──────────────────────┬───────────┘
           │ Browser              │ IBM Bob
           ▼                      ▼
┌──────────────────┐   ┌──────────────────────┐
│  SupplyGuard     │   │  MCP Server          │
│  Dashboard       │   │  (StdioTransport)    │
│  React 18 / Vite │   │  10 tools            │
│  Tailwind / Recharts   └──────────┬──────────┘
└──────────┬───────┘              │
           │ REST :3001           │
           ▼                      ▼
┌──────────────────────────────────────────────┐
│           Express REST API                   │
│           Node.js / TypeScript               │
└──┬──────┬──────┬──────┬──────┬──────┬───────┘
   │      │      │      │      │      │
   ▼      ▼      ▼      ▼      ▼      ▼
Disrupt  Risk  Route Carrier Fleet ColdChain
Engine  Engine Engine Engine Engine Engine
   │      │      │      │      │      │
   └──────┴──────┴──────┴──────┴──────┘
                     │
                     ▼
           ┌─────────────────┐
           │  In-Memory State │
           │  data/index.ts   │
           │  50 shipments    │
           │  20 disruptions  │
           │  30 fleet assets │
           │  10 carriers     │
           │  20 routes       │
           │  500+ IoT reads  │
           └─────────────────┘
```

**Tech stack:** TypeScript monorepo — backend, frontend, intelligence engines, MCP server, and tests all in one repo with shared types.

---

## Slide 11 — Demo: Rotterdam Port Strike

**Walk through this scenario live to demonstrate the full value chain:**

**Step 1: Baseline**
Open dashboard. Note: 0 active disruptions, moderate risk scores across the fleet.

**Step 2: Activate scenario**
Navigate to Scenarios → click "Activate" on Rotterdam Port Strike.
The Port of Rotterdam handles ~14M TEU/year; a strike affects all European trade lanes.

**Step 3: Risk propagation**
Return to Dashboard. Active Disruptions: 3. Affected Shipments: 14 (elevated risk).
Three shipments show CRITICAL risk scores (85+). Filter to CRITICAL.

**Step 4: Drill into SHP-003**
Risk score: 91/100. Reasons: `DISRUPTION_OVERLAP` + `HIGH_VALUE_CARGO` + `TIGHT_DEADLINE`.
Alternative routes panel: Route via Antwerp, +1 day, +$2,400 — badged `RECOMMENDED`.

**Step 5: Fleet redeployment**
Fleet Optimizer: 4 idle trucks. Truck FL-007 in Hamburg — 180 km from Rotterdam.
Benefit score: 84. Click REDEPLOY → assigned to SHP-003.

**Step 6: Ask Bob**
*"Give me the top 5 actions I should take right now"*
Bob calls `generate_operations_brief`, reads live state (scenario is active), returns prioritised list:
1. Reroute SHP-003 via Antwerp (CRITICAL — $1.2M cargo)
2. Redeploy FL-007 to cover SHP-003
3. Review cold-chain status of SHP-012 (CRITICAL excursion)
... etc.

---

## Slide 12 — Impact & Future Vision

### Hackathon Demonstration
- 7 fully functional intelligence engines
- 115/115 tests passing
- 10 MCP tools, all load-bearing
- Zero external API dependencies — runs locally in under 60 seconds

### Measured Value Delivered (on demo data)
- **Disruption response time:** From hours of email coordination to seconds of automated scoring
- **Fleet utilisation:** Identifies idle assets representing $12,400/day in aggregate wasted costs
- **Cold-chain:** Detects 7 CRITICAL excursions that would otherwise reach delivery undetected

### Path to Production
1. **Connect real data sources:** Maritime AIS feeds (disruptions), TMS webhooks (shipments), IoT gateways (cold chain)
2. **Add authentication:** OAuth 2.0 + role-based access (operators vs. managers vs. carriers)
3. **Replace in-memory state:** PostgreSQL + Redis for persistence and horizontal scaling
4. **Enhance Bob integration:** Add proactive push alerts via Bob when risk scores cross thresholds
5. **Regulatory compliance module:** Map cold-chain severity classifications to specific regulations (EU GDP, FDA 21 CFR Part 211)

### The Vision
A supply chain operations team that never discovers a disruption from a vendor email — because SupplyGuard told them 6 hours earlier, showed them which shipments were affected, recommended the reroute, and Bob confirmed the decision.
