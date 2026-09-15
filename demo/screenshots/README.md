# Screenshots

Capture these screenshots from the running application for submission.
Run the app (`npm run dev` in both `src/backend` and `src/frontend`) then take each screenshot.

## Required Screenshots

| Filename | What to Capture |
|---|---|
| `01-dashboard-overview.png` | Main dashboard with KPI cards (Active Disruptions, Affected Shipments, Idle Assets, Cold Chain Alerts) and sidebar navigation |
| `02-rotterdam-scenario.png` | After activating "Rotterdam Port Strike" scenario — disruption list shows newly active disruptions |
| `03-shipment-risk-detail.png` | Highest-risk shipment detail panel with score, risk factor breakdown, and risk reason labels |
| `04-alternative-routes.png` | Route recommendations panel showing 2-3 alternatives with the RECOMMENDED badge on the best option |
| `05-fleet-optimizer.png` | Fleet optimizer page showing idle asset list with asset type, idle duration, cost-per-day, and REDEPLOY button |
| `06-cold-chain-alerts.png` | Cold chain alerts table showing shipments with MINOR/MAJOR/CRITICAL severity badges |
| `07-temperature-chart.png` | Temperature time-series chart for a shipment with excursion window highlighted and severity annotation |
| `08-bob-copilot.png` | Bob Copilot panel after asking "Give me the top 5 actions I should take right now" — show Bob's response |
| `09-operations-brief.png` | Generated operations brief with health score, summary statistics, and prioritised action list |
| `10-scenarios-page.png` | Scenario selector page showing all 5 scenarios with activation buttons |

## Screenshot Instructions

1. Start both backend and frontend (see `docs/setup-guide.md`)
2. Open `http://localhost:5173`
3. Take `01-dashboard-overview.png` first (baseline state)
4. Navigate to Scenarios, activate "Rotterdam Port Strike"
5. Take `02-rotterdam-scenario.png`
6. Return to Dashboard/Shipments, click the top-risk shipment
7. Take `03-shipment-risk-detail.png` and `04-alternative-routes.png`
8. Navigate to Fleet, take `05-fleet-optimizer.png`
9. Navigate to Cold Chain, take `06-cold-chain-alerts.png`
10. Click a CRITICAL or MAJOR alert, take `07-temperature-chart.png`
11. Open Bob Copilot, submit the "top 5 actions" prompt, take `08-bob-copilot.png`
12. Navigate to Operations Brief, take `09-operations-brief.png`
13. Navigate to Scenarios, take `10-scenarios-page.png`

## Status

Screenshots have NOT been captured yet.
Run the application and capture them before submission.
