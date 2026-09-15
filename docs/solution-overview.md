# Solution Overview

## What We Built

SupplyGuard AI is an intelligent logistics control tower that consolidates supply chain disruption management, shipment risk scoring, fleet utilisation optimisation, and cold-chain monitoring into a single, unified interface. Rather than forcing operations teams to context-switch between siloed tracking tools, SupplyGuard correlates live disruption data with individual shipment routes, calculates transparent risk scores with per-factor breakdowns, and surfaces actionable recommendations — all without requiring a single external paid API.

IBM Bob is a first-class citizen, not an afterthought: a 10-tool MCP server exposes every intelligence engine to Bob as native tools, so an operator can ask "Which shipments are most affected right now?" and Bob will call the actual scoring logic against live application state and return structured, specific answers.

---

## The 6 Core Capabilities

### 1. Disruption Intelligence
The disruption engine ingests 20 pre-seeded disruptions (port strikes, weather events, carrier capacity failures, geopolitical incidents) and allows any of 5 pre-built scenarios to be activated in real time. Each disruption carries severity (`LOW`/`MEDIUM`/`HIGH`/`CRITICAL`), affected route IDs, and an estimated delay. When a scenario is activated, the engine flags the relevant disruptions as active and immediately propagates impact downstream.

### 2. Shipment Risk Scoring
For each of 50 shipments in the dataset, the risk engine calculates a composite risk score (0–100) by weighing four factors:
- **Disruption overlap** — does the shipment's route pass through an active disruption zone?
- **Carrier reliability** — historical on-time performance of the assigned carrier
- **Value sensitivity** — cargo value relative to total fleet exposure
- **Schedule urgency** — how close the delivery deadline is

Each scored shipment surfaces the top risk reasons as human-readable labels (`DISRUPTION_OVERLAP`, `CARRIER_RELIABILITY`, `HIGH_VALUE_CARGO`, `TIGHT_DEADLINE`), making the score explainable rather than opaque.

### 3. Route Optimisation
Given a shipment ID, the route engine compares the current route against up to 3 alternative routes, scoring each on estimated additional cost, added transit days, disruption exposure, and carrier reliability. The lowest-risk alternative is automatically badged `RECOMMENDED`.

### 4. Carrier Recommendations
The carrier engine queries the 10-carrier dataset and ranks alternatives by on-time performance, capacity availability, cost delta relative to the current carrier, and whether the carrier's primary lanes are currently disruption-free. Output includes a score and a plain-English recommendation reason.

### 5. Fleet Utilisation Optimizer
The fleet engine monitors 30 fleet assets (trucks, containers, vessels) and identifies assets that have been idle for more than a configurable threshold. For each idle asset it calculates: estimated cost of continued idling per day, which affected shipments are geographically close, and the benefit score if the asset were redeployed. The output is a ranked list of `REDEPLOY` recommendations with specific target shipments and estimated saving.

### 6. Cold-Chain Intelligence
The cold-chain engine processes 500+ synthetic IoT temperature readings attached to refrigerated shipments. For each reading it computes:
- Whether the reading falls within the product's acceptable temperature band
- Duration of any excursion (time outside range)
- Maximum deviation from the acceptable limit
- Severity classification: `NORMAL` / `MINOR` (< 2 °C deviation, < 30 min) / `MAJOR` (2–5 °C, 30–120 min) / `CRITICAL` (> 5 °C or > 120 min)

The dashboard renders a time-series temperature chart per shipment with excursion events annotated.

---

## IBM Bob MCP Integration

SupplyGuard ships a dedicated MCP server at `src/mcp/` using the `@modelcontextprotocol/sdk` with `StdioServerTransport`. Bob connects via the local stdio transport, meaning no network ports are needed — Bob spawns the MCP process directly.

The 10 tools exposed to Bob:

| Tool | What it does |
|---|---|
| `get_active_disruptions` | Returns all active disruptions, optionally filtered by severity |
| `get_affected_shipments` | Returns shipments impacted by disruptions, with risk scores |
| `analyze_shipment_risk` | Deep-dives one shipment: score, breakdown, risk reasons |
| `recommend_routes` | Returns ranked alternative routes for a specific shipment |
| `recommend_carriers` | Returns ranked alternative carriers for a specific shipment |
| `get_idle_fleet` | Returns all idle fleet assets, optionally filtered by type |
| `recommend_fleet_redeployment` | Returns redeployment recommendations for idle assets |
| `get_cold_chain_alerts` | Returns active temperature excursion alerts |
| `analyze_temperature_excursion` | Full time-series analysis for a cold-chain shipment |
| `generate_operations_brief` | Generates a comprehensive current-state brief with priorities |

Every tool calls the exact same TypeScript intelligence engine functions used by the REST API — there is no separate MCP data layer. Bob sees live application state.

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Single TypeScript monorepo for all engines | Allows the MCP server, REST API, and tests to import the same intelligence functions with no duplication |
| In-memory JSON state for demo | Eliminates database setup friction during evaluation — the app runs in under 60 seconds with `npm install && npm run dev` |
| MCP over direct LLM integration | IBM Bob + MCP is the correct integration pattern for the hackathon; it keeps intelligence logic in the application layer and makes Bob an operator rather than a replacement |
| Transparent risk scoring | Every risk score carries per-factor labels. Judges and operators can see *why* a shipment is critical, not just that it is |
| Configurable severity thresholds | Cold-chain severity cutoffs are defined in `src/data/config/` so they can be tuned to specific product/regulatory requirements without touching engine logic |
| 500+ IoT readings as synthetic time-series | Gives the cold-chain engine real signal to process — the excursion detection is not hardcoded per shipment |

---

## What Makes SupplyGuard Different from Generic Dashboards

Generic logistics dashboards display data. SupplyGuard correlates it:

- **Risk scores are computed**, not reported. A shipment is not "affected" simply because a disruption exists on its continent — the engine checks whether the shipment's specific route segments overlap with the disruption's affected route IDs.
- **Recommendations are ranked**, not listed. Routes and carriers are scored on multiple dimensions simultaneously and the best option is surfaced automatically.
- **Cold-chain analysis is temporal**, not threshold-triggered. A single reading 0.5 °C above the limit does not fire a CRITICAL alert. The engine measures duration and deviation together, matching how regulators and quality managers actually evaluate excursions.
- **Bob integration is load-bearing**. Every intelligence capability is accessible through natural language. An operator with no UI training can ask Bob a question and receive a specific, data-backed answer drawn from live application state.
