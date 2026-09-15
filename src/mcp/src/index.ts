// ============================================================
// SupplyGuard AI — MCP Server for IBM Bob Integration
// IBM Bob AI Innovation Hackathon 2026 — Team Phoenix
// ============================================================
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// ── Intelligence engines ────────────────────────────────────
import { getActiveDisruptions } from '../../intelligence/disruptionEngine.js';
import {
  getAffectedShipments,
  analyzeShipmentRisk,
} from '../../intelligence/shipmentRiskEngine.js';
import { getAlternativeRoutes } from '../../intelligence/routeEngine.js';
import { getAlternativeCarriers } from '../../intelligence/carrierEngine.js';
import {
  getIdleAssets,
  recommendRedeployment,
  getAllRedeploymentRecommendations,
} from '../../intelligence/fleetEngine.js';
import {
  getActiveAlerts,
  analyzeShipmentTemperature,
} from '../../intelligence/coldChainEngine.js';
import { generateOperationsBrief } from '../../intelligence/operationsBrief.js';
import { state } from '../../data/index.js';

// ── Server setup ────────────────────────────────────────────
const server = new Server(
  {
    name: 'supplyguard-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ── Tool definitions ────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_active_disruptions',
        description:
          'Get all active supply chain disruptions with severity levels and affected routes',
        inputSchema: {
          type: 'object',
          properties: {
            severity: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
              description: 'Optional: filter disruptions by severity level',
            },
          },
        },
      },
      {
        name: 'get_affected_shipments',
        description:
          'Get all shipments affected by active disruptions with risk scores',
        inputSchema: {
          type: 'object',
          properties: {
            disruption_id: {
              type: 'string',
              description: 'Optional: filter shipments affected by a specific disruption ID',
            },
            risk_level: {
              type: 'string',
              enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
              description: 'Optional: filter by minimum risk level',
            },
          },
        },
      },
      {
        name: 'analyze_shipment_risk',
        description:
          'Analyze the risk for a specific shipment and explain why it is at risk',
        inputSchema: {
          type: 'object',
          properties: {
            shipment_id: {
              type: 'string',
              description: 'The shipment ID to analyze (e.g. SHP-001)',
            },
          },
          required: ['shipment_id'],
        },
      },
      {
        name: 'recommend_routes',
        description:
          'Get alternative route recommendations for an affected shipment',
        inputSchema: {
          type: 'object',
          properties: {
            shipment_id: {
              type: 'string',
              description: 'The shipment ID to get route recommendations for',
            },
          },
          required: ['shipment_id'],
        },
      },
      {
        name: 'recommend_carriers',
        description:
          'Get alternative carrier recommendations for a shipment',
        inputSchema: {
          type: 'object',
          properties: {
            shipment_id: {
              type: 'string',
              description: 'The shipment ID to get carrier recommendations for',
            },
          },
          required: ['shipment_id'],
        },
      },
      {
        name: 'get_idle_fleet',
        description:
          'Get all idle fleet assets that can be redeployed to help affected shipments',
        inputSchema: {
          type: 'object',
          properties: {
            asset_type: {
              type: 'string',
              enum: ['TRUCK', 'CONTAINER', 'VESSEL'],
              description: 'Optional: filter idle assets by type',
            },
          },
        },
      },
      {
        name: 'recommend_fleet_redeployment',
        description:
          'Get redeployment recommendations for idle fleet assets',
        inputSchema: {
          type: 'object',
          properties: {
            asset_id: {
              type: 'string',
              description: 'Optional: get recommendation for a specific asset ID',
            },
            shipment_id: {
              type: 'string',
              description: 'Optional: get recommendation targeting a specific shipment',
            },
          },
        },
      },
      {
        name: 'get_cold_chain_alerts',
        description:
          'Get all active cold chain temperature alerts and excursion events',
        inputSchema: {
          type: 'object',
          properties: {
            severity: {
              type: 'string',
              enum: ['NORMAL', 'MINOR', 'MAJOR', 'CRITICAL'],
              description: 'Optional: filter alerts by severity level',
            },
          },
        },
      },
      {
        name: 'analyze_temperature_excursion',
        description:
          'Analyze temperature readings for a cold-chain shipment and classify excursion severity',
        inputSchema: {
          type: 'object',
          properties: {
            shipment_id: {
              type: 'string',
              description: 'The cold-chain shipment ID to analyze',
            },
          },
          required: ['shipment_id'],
        },
      },
      {
        name: 'generate_operations_brief',
        description:
          'Generate a comprehensive operations brief with current supply chain status, priorities and recommended actions',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
    ],
  };
});

// ── Tool handlers ───────────────────────────────────────────
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      // ── Tool 1: get_active_disruptions ──────────────────────
      case 'get_active_disruptions': {
        const params = z
          .object({ severity: z.string().optional() })
          .parse(args ?? {});

        let disruptions = getActiveDisruptions();

        if (params.severity) {
          disruptions = disruptions.filter(
            (d) => d.severity === params.severity
          );
        }

        if (disruptions.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: params.severity
                  ? `No active ${params.severity} severity disruptions found.`
                  : 'No active disruptions found. Supply chain appears stable.',
              },
            ],
          };
        }

        const text = disruptions
          .map(
            (d) =>
              `📍 ${d.id}: ${d.name}\n` +
              `   Severity: ${d.severity} | Status: ${d.status} | Type: ${d.type}\n` +
              `   Location: ${d.location}\n` +
              `   Affected routes: ${d.affectedRoutes.join(', ')}\n` +
              `   Affected carriers: ${(d.affectedCarriers ?? []).join(', ') || 'None listed'}\n` +
              `   Est. delay: ${d.estimatedDelayHours ?? 'Unknown'}h\n` +
              `   Expected end: ${new Date(d.expectedEndTime).toLocaleDateString()}\n` +
              `   Description: ${d.description.substring(0, 150)}...`
          )
          .join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${disruptions.length} active disruption(s):\n\n${text}`,
            },
          ],
        };
      }

      // ── Tool 2: get_affected_shipments ──────────────────────
      case 'get_affected_shipments': {
        const params = z
          .object({
            disruption_id: z.string().optional(),
            risk_level: z.string().optional(),
          })
          .parse(args ?? {});

        let results = getAffectedShipments();

        if (params.disruption_id) {
          const dis = state.disruptions.find(
            (d) => d.id === params.disruption_id
          );
          if (!dis) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Disruption ${params.disruption_id} not found.`,
                },
              ],
            };
          }
          results = results.filter((r) =>
            dis.affectedRoutes.includes(r.shipment.routeId) ||
            (dis.affectedCarriers?.includes(r.shipment.carrierId) ?? false)
          );
        }

        const riskOrder: Record<string, number> = {
          CRITICAL: 0,
          HIGH: 1,
          MEDIUM: 2,
          LOW: 3,
        };
        if (params.risk_level) {
          const threshold = riskOrder[params.risk_level] ?? 3;
          results = results.filter(
            (r) => (riskOrder[r.riskScore.riskLevel] ?? 3) <= threshold
          );
        }

        if (results.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No affected shipments found matching the specified criteria.',
              },
            ],
          };
        }

        const text = results
          .map(
            ({ shipment, riskScore }) =>
              `🚢 ${shipment.shipmentId}: ${shipment.cargoDescription.split('—')[0]!.trim()}\n` +
              `   Risk: ${riskScore.riskLevel} (score: ${riskScore.overallScore}/100)\n` +
              `   Status: ${shipment.status} | Priority: ${shipment.priority}\n` +
              `   Route: ${shipment.routeId} | Carrier: ${shipment.carrierId}\n` +
              `   Est. delay: ${riskScore.estimatedDelayHours}h\n` +
              `   Cargo value: $${(shipment.cargoValueUSD / 1_000_000).toFixed(2)}M\n` +
              `   Reasons: ${riskScore.reasons.slice(0, 3).join('; ')}`
          )
          .join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${results.length} affected shipment(s) (sorted by risk):\n\n${text}`,
            },
          ],
        };
      }

      // ── Tool 3: analyze_shipment_risk ───────────────────────
      case 'analyze_shipment_risk': {
        const params = z
          .object({ shipment_id: z.string() })
          .parse(args ?? {});

        const shipment = state.shipments.find(
          (s) => s.shipmentId === params.shipment_id
        );
        if (!shipment) {
          return {
            content: [
              {
                type: 'text',
                text: `Shipment ${params.shipment_id} not found. Please check the shipment ID.`,
              },
            ],
          };
        }

        const activeDisruptions = getActiveDisruptions();
        const riskScore = analyzeShipmentRisk(shipment, activeDisruptions);

        const factorsText = riskScore.factors
          .map(
            (f) =>
              `   • ${f.factor}: ${f.score}/100 (weight: ${(f.weight * 100).toFixed(0)}%) — ${f.description}`
          )
          .join('\n');

        const text =
          `🔍 Risk Analysis for ${shipment.shipmentId}\n` +
          `   Cargo: ${shipment.cargoDescription}\n` +
          `   Overall Risk: ${riskScore.riskLevel} (score: ${riskScore.overallScore}/100)\n` +
          `   Estimated delay: ${riskScore.estimatedDelayHours}h\n` +
          `   Cargo value at risk: $${(riskScore.cargoValueAtRisk / 1_000_000).toFixed(2)}M\n\n` +
          `Risk Factors:\n${factorsText}\n\n` +
          `Key Reasons:\n${riskScore.reasons.map((r) => `   ⚠️  ${r}`).join('\n') || '   No specific risk reasons identified.'}`;

        return {
          content: [{ type: 'text', text }],
        };
      }

      // ── Tool 4: recommend_routes ────────────────────────────
      case 'recommend_routes': {
        const params = z
          .object({ shipment_id: z.string() })
          .parse(args ?? {});

        const shipment = state.shipments.find(
          (s) => s.shipmentId === params.shipment_id
        );
        if (!shipment) {
          return {
            content: [
              {
                type: 'text',
                text: `Shipment ${params.shipment_id} not found.`,
              },
            ],
          };
        }

        const recommendations = getAlternativeRoutes(shipment);

        if (recommendations.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No alternative routes found for shipment ${params.shipment_id}. Current route may be the only option.`,
              },
            ],
          };
        }

        const text = recommendations
          .map(
            (rec) =>
              `${rec.recommendation === 'RECOMMENDED' ? '✅' : rec.recommendation === 'ALTERNATIVE' ? '🔵' : '⛔'} ` +
              `${rec.route.routeId}: ${rec.route.name} [${rec.recommendation}]\n` +
              `   Risk score: ${rec.riskScore}/100 | Est. ${rec.estimatedDays} days | Cost: $${rec.estimatedCostUSD.toLocaleString()}\n` +
              `   Mode: ${rec.route.transportMode} | Waypoints: ${rec.route.waypoints.map((w) => w.location.name).join(' → ')}\n` +
              `   ${rec.reasoning}` +
              (rec.savingsVsCurrent
                ? `\n   ⏱️  Saves ~${rec.savingsVsCurrent}h vs current route`
                : '')
          )
          .join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `Route recommendations for ${params.shipment_id}:\n\n${text}`,
            },
          ],
        };
      }

      // ── Tool 5: recommend_carriers ──────────────────────────
      case 'recommend_carriers': {
        const params = z
          .object({ shipment_id: z.string() })
          .parse(args ?? {});

        const shipment = state.shipments.find(
          (s) => s.shipmentId === params.shipment_id
        );
        if (!shipment) {
          return {
            content: [
              {
                type: 'text',
                text: `Shipment ${params.shipment_id} not found.`,
              },
            ],
          };
        }

        const recommendations = getAlternativeCarriers(shipment);

        if (recommendations.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No alternative carriers found for shipment ${params.shipment_id}.`,
              },
            ],
          };
        }

        const text = recommendations
          .map(
            (rec) =>
              `#${rec.rank} ${rec.carrier.carrierId}: ${rec.carrier.name}\n` +
              `   Score: ${rec.score}/100 | Reliability: ${rec.carrier.reliabilityScore}/100\n` +
              `   Capacity: ${rec.availableCapacity.toLocaleString()} TEU | Est. cost: $${rec.estimatedCostUSD.toLocaleString()}\n` +
              `   ${rec.reasoning}\n` +
              (rec.pros.length > 0
                ? `   ✅ Pros: ${rec.pros.join(' | ')}\n`
                : '') +
              (rec.cons.length > 0 ? `   ⚠️  Cons: ${rec.cons.join(' | ')}` : '')
          )
          .join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `Carrier recommendations for ${params.shipment_id} (ranked by score):\n\n${text}`,
            },
          ],
        };
      }

      // ── Tool 6: get_idle_fleet ──────────────────────────────
      case 'get_idle_fleet': {
        const params = z
          .object({ asset_type: z.string().optional() })
          .parse(args ?? {});

        let assets = getIdleAssets();

        if (params.asset_type) {
          assets = assets.filter((a) => a.type === params.asset_type);
        }

        if (assets.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: params.asset_type
                  ? `No idle ${params.asset_type} assets available for redeployment.`
                  : 'No idle fleet assets found.',
              },
            ],
          };
        }

        const now = new Date();
        const text = assets
          .map((asset) => {
            const idleHours = Math.round(
              (now.getTime() - new Date(asset.lastActivity).getTime()) /
                (1000 * 60 * 60)
            );
            return (
              `🚛 ${asset.assetId}: ${asset.name}\n` +
              `   Type: ${asset.type} | Status: ${asset.status}\n` +
              `   Location: ${asset.currentLocation.name}\n` +
              `   Capacity: ${asset.capacity} (TEU/tonnes)\n` +
              `   Cold-capable: ${asset.isColdCapable ? 'Yes' : 'No'}\n` +
              `   Idle for: ~${idleHours}h`
            );
          })
          .join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${assets.length} idle fleet asset(s):\n\n${text}`,
            },
          ],
        };
      }

      // ── Tool 7: recommend_fleet_redeployment ────────────────
      case 'recommend_fleet_redeployment': {
        const params = z
          .object({
            asset_id: z.string().optional(),
            shipment_id: z.string().optional(),
          })
          .parse(args ?? {});

        if (params.asset_id) {
          const asset = state.fleetAssets.find(
            (a) => a.assetId === params.asset_id
          );
          if (!asset) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Asset ${params.asset_id} not found.`,
                },
              ],
            };
          }
          const rec = recommendRedeployment(asset);
          if (!rec) {
            return {
              content: [
                {
                  type: 'text',
                  text: `No suitable redeployment target found for asset ${params.asset_id}.`,
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text:
                  `🔄 Redeployment Recommendation for ${rec.asset.assetId} (${rec.asset.name})\n` +
                  `   Target shipment: ${rec.targetShipmentId}\n` +
                  `   From: ${rec.currentLocation.name} → To: ${rec.targetLocation.name}\n` +
                  `   Transit time: ${rec.transitHours}h\n` +
                  `   Estimated benefit: ~${rec.estimatedBenefitHours}h delay reduction\n` +
                  `   Priority: ${rec.priority}\n` +
                  `   ${rec.reasoning}`,
              },
            ],
          };
        }

        // All redeployment recommendations
        const allRecs = getAllRedeploymentRecommendations();
        let filtered = allRecs;

        if (params.shipment_id) {
          filtered = allRecs.filter(
            (r) => r.targetShipmentId === params.shipment_id
          );
        }

        if (filtered.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No redeployment recommendations available.',
              },
            ],
          };
        }

        const text = filtered
          .map(
            (rec) =>
              `🔄 ${rec.asset.assetId} (${rec.asset.name}) → ${rec.targetShipmentId}\n` +
              `   Priority: ${rec.priority} | Transit: ${rec.transitHours}h | Benefit: ~${rec.estimatedBenefitHours}h saved\n` +
              `   From: ${rec.currentLocation.name} → To: ${rec.targetLocation.name}\n` +
              `   ${rec.reasoning}`
          )
          .join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `${filtered.length} fleet redeployment recommendation(s):\n\n${text}`,
            },
          ],
        };
      }

      // ── Tool 8: get_cold_chain_alerts ───────────────────────
      case 'get_cold_chain_alerts': {
        const params = z
          .object({ severity: z.string().optional() })
          .parse(args ?? {});

        let alerts = getActiveAlerts();

        if (params.severity) {
          alerts = alerts.filter((a) => a.severity === params.severity);
        }

        if (alerts.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: params.severity
                  ? `No ${params.severity} cold chain alerts found.`
                  : 'No active cold chain alerts. All temperature-sensitive shipments are within specification.',
              },
            ],
          };
        }

        const text = alerts
          .map(
            (alert) =>
              `🌡️  ${alert.alertId}\n` +
              `   Shipment: ${alert.shipmentId} | Sensor: ${alert.sensorId}\n` +
              `   Severity: ${alert.severity}\n` +
              `   Current temp: ${alert.currentTemp}°C | Allowed: ${alert.allowedMin}–${alert.allowedMax}°C\n` +
              `   Deviation: +${alert.deviation}°C | Duration: ${alert.excursionDurationMinutes} min\n` +
              `   Detected at: ${new Date(alert.detectedAt).toLocaleString()}\n` +
              `   Message: ${alert.message}`
          )
          .join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${alerts.length} cold chain alert(s):\n\n${text}`,
            },
          ],
        };
      }

      // ── Tool 9: analyze_temperature_excursion ───────────────
      case 'analyze_temperature_excursion': {
        const params = z
          .object({ shipment_id: z.string() })
          .parse(args ?? {});

        const shipment = state.shipments.find(
          (s) => s.shipmentId === params.shipment_id
        );
        if (!shipment) {
          return {
            content: [
              {
                type: 'text',
                text: `Shipment ${params.shipment_id} not found.`,
              },
            ],
          };
        }
        if (!shipment.isColdChain) {
          return {
            content: [
              {
                type: 'text',
                text: `Shipment ${params.shipment_id} (${shipment.cargoDescription.split('—')[0]!.trim()}) is not a cold-chain shipment.`,
              },
            ],
          };
        }

        const analysis = analyzeShipmentTemperature(params.shipment_id);
        if (!analysis) {
          return {
            content: [
              {
                type: 'text',
                text: `No IoT temperature readings found for shipment ${params.shipment_id}. Cold chain analysis unavailable.`,
              },
            ],
          };
        }

        const excursionText =
          analysis.excursions.length === 0
            ? '   No excursion events detected.'
            : analysis.excursions
                .map(
                  (e, i) =>
                    `   Event ${i + 1}: ${e.severity} — ${e.durationMinutes} min, ` +
                    `temps ${e.minTemp}–${e.maxTemp}°C, max deviation ${e.maxDeviation}°C ` +
                    `(${new Date(e.startTime).toLocaleString()} → ${new Date(e.endTime).toLocaleString()})`
                )
                .join('\n');

        const text =
          `🌡️  Cold Chain Analysis for ${params.shipment_id}\n` +
          `   Cargo: ${shipment.cargoDescription}\n` +
          `   Cargo type: ${analysis.cargoType}\n` +
          `   Allowed range: ${analysis.allowedMin}°C to ${analysis.allowedMax}°C\n` +
          `   Overall severity: ${analysis.overallSeverity}\n` +
          `   Time in range: ${analysis.percentTimeInRange}%\n` +
          `   Total readings: ${analysis.totalReadings}\n` +
          `   Max deviation: ${analysis.maxDeviation}°C\n\n` +
          `Excursion Events (${analysis.excursions.length}):\n${excursionText}\n\n` +
          `Recommendation:\n   ${analysis.recommendation}`;

        return {
          content: [{ type: 'text', text }],
        };
      }

      // ── Tool 10: generate_operations_brief ──────────────────
      case 'generate_operations_brief': {
        const brief = generateOperationsBrief();

        const actionsText = brief.recommendedActions
          .map(
            (a) =>
              `   ${a.rank}. [${a.urgency}] ${a.action}\n` +
              `      Reason: ${a.reason}\n` +
              `      Impact: ${a.impactDescription}` +
              (a.affectedShipments.length > 0
                ? `\n      Shipments: ${a.affectedShipments.join(', ')}`
                : '')
          )
          .join('\n\n');

        const disruptionNames = brief.activeDisruptions
          .map((d) => `${d.id} (${d.severity})`)
          .join(', ');
        const criticalShipmentIds = brief.criticalShipments
          .map((s) => s.shipmentId)
          .join(', ');

        const text =
          `📊 SUPPLYGUARD OPERATIONS BRIEF — ${new Date(brief.generatedAt).toLocaleString()}\n` +
          `${'─'.repeat(60)}\n\n` +
          `SUPPLY CHAIN HEALTH: ${brief.supplyChainHealth} (${brief.healthScore}/100)\n\n` +
          `SUMMARY:\n   ${brief.summary}\n\n` +
          `KEY METRICS:\n` +
          `   • Active disruptions: ${brief.activeDisruptions.length} (${disruptionNames || 'None'})\n` +
          `   • Shipments at HIGH/CRITICAL risk: ${brief.shipmentsAtRisk}\n` +
          `   • Total cargo value at risk: $${(brief.totalCargoValueAtRiskUSD / 1_000_000).toFixed(1)}M\n` +
          `   • Cold chain alerts: ${brief.coldChainAlerts.length}\n` +
          `   • Delays detected: ${brief.delaysDetected}\n` +
          `   • Fleet redeployment opportunities: ${brief.idleFleetOpportunities.length}\n` +
          (criticalShipmentIds
            ? `   • Critical shipments: ${criticalShipmentIds}\n`
            : '') +
          `\nPRIORITIZED ACTIONS:\n${actionsText || '   No immediate actions required.'}\n\n` +
          `EXPECTED IMPACT:\n   ${brief.expectedImpact}`;

        return {
          content: [{ type: 'text', text }],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}. Available tools: get_active_disruptions, get_affected_shipments, analyze_shipment_risk, recommend_routes, recommend_carriers, get_idle_fleet, recommend_fleet_redeployment, get_cold_chain_alerts, analyze_temperature_excursion, generate_operations_brief`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error executing tool "${name}": ${message}`,
        },
      ],
      isError: true,
    };
  }
});

// ── Start server ────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[SupplyGuard MCP] Server running on stdio');
}

main().catch((err) => {
  console.error('[SupplyGuard MCP] Fatal error:', err);
  process.exit(1);
});
