// ============================================================
// SupplyGuard AI — Copilot Intelligence Engine
// Natural language query routing to domain engines
// ============================================================
import type {
  CopilotResponse,
  QueryIntent,
} from '../shared/types';
import { state } from '../data/index';
import {
  getActiveDisruptions,
  getDisruptionsRankedBySeverity,
  summarizeDisruption,
} from './disruptionEngine';
import {
  analyzeShipmentRisk,
  getAffectedShipments,
  getHighestRiskShipment,
  getTotalCargoValueAtRisk,
} from './shipmentRiskEngine';
import { getAlternativeRoutes } from './routeEngine';
import { getAlternativeCarriers } from './carrierEngine';
import { getIdleAssets, getAllRedeploymentRecommendations } from './fleetEngine';
import { getActiveAlerts, analyzeShipmentTemperature } from './coldChainEngine';
import { generateOperationsBrief } from './operationsBrief';

// ─── Intent detection ─────────────────────────────────────────

/**
 * Parses a natural language query and classifies the intent.
 */
export function detectIntent(query: string): QueryIntent {
  const q = query.toLowerCase();

  // Greetings, help, and introductory queries
  const cleanQ = q.trim().replace(/^[!?,.\s]+|[!?,.\s]+$/g, '');
  if (
    /^(hi|hello|hey|greetings|howdy|good\s+(morning|afternoon|evening)|help|who\s+are\s+you|what\s+can\s+you\s+do|what\s+do\s+you\s+do)$/i.test(cleanQ) ||
    cleanQ === 'hi' ||
    cleanQ === 'hello' ||
    cleanQ === 'hey' ||
    cleanQ.startsWith('hi ') ||
    cleanQ.startsWith('hello ') ||
    cleanQ.startsWith('hey ')
  ) {
    return 'GREETING';
  }

  // Specific shipment lookup — e.g. "SHP-1042", "shp-001"
  if (/shp-\d+/i.test(query)) return 'SPECIFIC_SHIPMENT';

  // Cold chain
  if (
    q.includes('temperature') || q.includes('cold chain') || q.includes('excursion') ||
    q.includes('reefer') || q.includes('cold-chain') || q.includes('cold chain')
  )
    return 'COLD_CHAIN';

  // Fleet / trucks
  if (
    q.includes('idle') || q.includes('truck') || q.includes('vessel') ||
    q.includes('fleet') || q.includes('redeploy') || q.includes('container')
  )
    return 'FLEET';

  // Carrier
  if (
    q.includes('carrier') || q.includes('replace') || q.includes('shipping line') ||
    q.includes('alternative carrier') || q.includes('who should')
  )
    return 'CARRIERS';

  // Route
  if (
    q.includes('route') || q.includes('reroute') || q.includes('safest') ||
    q.includes('alternative route') || q.includes('bypass')
  )
    return 'ROUTES';

  // Top actions
  if (
    q.includes('top') && (q.includes('action') || q.includes('priority') || q.includes('five')) ||
    q.includes('what should i do') || q.includes('recommend')
  )
    return 'TOP_ACTIONS';

  // Cargo value
  if (
    q.includes('cargo value') || q.includes('value at risk') ||
    q.includes('highest value') || q.includes('most valuable')
  )
    return 'CARGO_VALUE';

  // Brief / situation
  if (
    q.includes('brief') || q.includes('summarize') || q.includes('situation') ||
    q.includes('summary') || q.includes('overview') || q.includes('status')
  )
    return 'BRIEF';

  // Disruption
  if (
    q.includes('disruption') || q.includes('strike') || q.includes('storm') ||
    q.includes('closure') || q.includes('affected') || q.includes('impact')
  )
    return 'DISRUPTIONS';

  // Risk
  if (
    q.includes('risk') || q.includes('critical') || q.includes('delayed') ||
    q.includes('at risk') || q.includes('highest risk')
  )
    return 'SHIPMENT_RISK';

  return 'UNKNOWN';
}

// ─── Query handlers ───────────────────────────────────────────

function handleGreeting(query: string): CopilotResponse {
  return {
    query,
    intent: 'GREETING',
    naturalLanguageAnswer:
      "Hello! I am your IBM Bob AI Copilot for SupplyGuard. I have real-time visibility across your entire supply chain — disruptions, shipments, fleet, and cold chain.\n\n" +
      "Here are some questions you can ask me:\n" +
      "• \"Give me the top 5 actions I should take right now\"\n" +
      "• \"Which shipments are most affected by active disruptions?\"\n" +
      "• \"Which shipment has the highest risk?\"\n" +
      "• \"Show me idle trucks that can be redeployed\"\n" +
      "• \"Which cold-chain shipments have temperature excursions?\"\n" +
      "• \"Summarize today's supply chain situation\"",
    data: null,
    suggestedFollowUps: [
      'Give me the top 5 actions I should take right now',
      'Which shipments are most affected by active disruptions?',
      'Which shipment has the highest risk?',
      'Show me idle trucks that can be redeployed',
    ],
    generatedAt: new Date().toISOString(),
  };
}

function handleDisruptions(query: string): CopilotResponse {
  const active = getActiveDisruptions();
  const ranked = getDisruptionsRankedBySeverity().slice(0, 5);
  const affected = getAffectedShipments().slice(0, 8);

  const answer =
    active.length === 0
      ? 'There are currently no active disruptions. The supply chain is operating normally.'
      : `There are ${active.length} active disruption(s). ` +
        `The most severe is "${ranked[0]?.disruption.name}" ` +
        `(severity score: ${ranked[0]?.score}/100). ` +
        `${affected.length} shipment(s) are currently affected. ` +
        ranked
          .slice(0, 3)
          .map(r => summarizeDisruption(r.disruption))
          .join(' ');

  return {
    query,
    intent: 'DISRUPTIONS',
    naturalLanguageAnswer: answer,
    data: {
      activeDisruptions: active,
      rankedBySeverity: ranked,
      affectedShipments: affected.map(r => ({
        shipmentId: r.shipment.shipmentId,
        riskScore: r.riskScore.overallScore,
        riskLevel: r.riskScore.riskLevel,
      })),
    },
    relatedShipments: affected.slice(0, 5).map(r => r.shipment.shipmentId),
    suggestedFollowUps: [
      'Which shipments are most affected by the active disruption?',
      'What is the safest alternative route for the top affected shipment?',
      'Which carrier should replace the disrupted carrier?',
    ],
    generatedAt: new Date().toISOString(),
  };
}

function handleShipmentRisk(): CopilotResponse {
  const results = getAffectedShipments().slice(0, 10);
  const top = results[0] ?? null;

  const answer =
    !top
      ? 'No shipments are currently at elevated risk.'
      : `The highest-risk shipment is ${top.shipment.shipmentId} (${top.shipment.cargoDescription.split('—').at(0)!.trim()}): ` +
        `risk score ${top.riskScore.overallScore}/100 (${top.riskScore.riskLevel}). ` +
        `Estimated delay: ${top.riskScore.estimatedDelayHours}h. ` +
        `Reasons: ${top.riskScore.reasons.slice(0, 2).join('; ')}.`;

  return {
    query: 'Which shipment has the highest risk?',
    intent: 'SHIPMENT_RISK',
    naturalLanguageAnswer: answer,
    data: results.map(r => ({
      shipmentId: r.shipment.shipmentId,
      cargoDescription: r.shipment.cargoDescription,
      riskScore: r.riskScore.overallScore,
      riskLevel: r.riskScore.riskLevel,
      estimatedDelayHours: r.riskScore.estimatedDelayHours,
      cargoValueAtRisk: r.riskScore.cargoValueAtRisk,
      reasons: r.riskScore.reasons,
    })),
    relatedShipments: results.slice(0, 5).map(r => r.shipment.shipmentId),
    suggestedFollowUps: [
      'What is the safest alternative route for the top affected shipment?',
      'Which carrier should replace the current carrier?',
      'Summarize today\'s supply-chain situation',
    ],
    generatedAt: new Date().toISOString(),
  };
}

function handleAffectedShipments(): CopilotResponse {
  const disruptions = getActiveDisruptions();
  const results = getAffectedShipments(disruptions).slice(0, 10);

  const firstResult = results[0] ?? null;
  const answer =
    !firstResult
      ? 'No shipments are currently affected by active disruptions.'
      : `${results.length} shipment(s) are affected by active disruptions. ` +
        `The most at-risk is ${firstResult.shipment.shipmentId} ` +
        `(${firstResult.shipment.cargoDescription.split('—').at(0)!.trim()}) ` +
        `with risk score ${firstResult.riskScore.overallScore}/100.`;

  return {
    query: 'Which shipments are most affected by the active disruption?',
    intent: 'DISRUPTIONS',
    naturalLanguageAnswer: answer,
    data: results.map(r => ({
      shipmentId: r.shipment.shipmentId,
      cargoDescription: r.shipment.cargoDescription,
      status: r.shipment.status,
      priority: r.shipment.priority,
      riskScore: r.riskScore.overallScore,
      riskLevel: r.riskScore.riskLevel,
      estimatedDelayHours: r.riskScore.estimatedDelayHours,
    })),
    relatedShipments: results.slice(0, 6).map(r => r.shipment.shipmentId),
    suggestedFollowUps: [
      'Which shipment has the highest risk?',
      'What is the safest alternative route for the top affected shipment?',
      'Which shipments have the highest cargo value at risk?',
    ],
    generatedAt: new Date().toISOString(),
  };
}

function handleRoutes(query: string): CopilotResponse {
  // Try to extract shipment ID
  const match = query.match(/SHP-\d+/i);
  let shipment = match
    ? state.shipments.find(s => s.shipmentId === match[0].toUpperCase())
    : null;

  // Fall back to highest-risk shipment
  if (!shipment) {
    const top = getHighestRiskShipment();
    shipment = top?.shipment ?? null;
  }

  if (!shipment) {
    return {
      query,
      intent: 'ROUTES',
      naturalLanguageAnswer: 'No shipment found to recommend routes for.',
      data: [],
      suggestedFollowUps: ['Which shipment has the highest risk?'],
      generatedAt: new Date().toISOString(),
    };
  }

  const recommendations = getAlternativeRoutes(shipment);
  const recommended = recommendations.find(r => r.recommendation === 'RECOMMENDED') ?? recommendations[0] ?? null;

  const answer =
    !recommended
      ? `No alternative routes found for ${shipment.shipmentId}.`
      : `For shipment ${shipment.shipmentId} (${shipment.cargoDescription.split('—').at(0)!.trim()}), ` +
        `the recommended route is "${recommended.route.name}" ` +
        `with risk score ${recommended.riskScore}/100. ` +
        `${recommended.reasoning}`;

  return {
    query,
    intent: 'ROUTES',
    naturalLanguageAnswer: answer,
    data: {
      shipmentId: shipment.shipmentId,
      recommendations,
    },
    relatedShipments: [shipment.shipmentId],
    suggestedFollowUps: [
      `Which carrier should replace the current carrier for ${shipment.shipmentId}?`,
      'Which shipments have the highest cargo value at risk?',
      'Summarize today\'s supply-chain situation',
    ],
    generatedAt: new Date().toISOString(),
  };
}

function handleCarriers(query: string): CopilotResponse {
  const match = query.match(/SHP-\d+/i);
  let shipment = match
    ? state.shipments.find(s => s.shipmentId === match[0].toUpperCase())
    : null;

  if (!shipment) {
    const top = getHighestRiskShipment();
    shipment = top?.shipment ?? null;
  }

  if (!shipment) {
    return {
      query,
      intent: 'CARRIERS',
      naturalLanguageAnswer: 'No shipment found for carrier recommendations.',
      data: [],
      suggestedFollowUps: ['Which shipment has the highest risk?'],
      generatedAt: new Date().toISOString(),
    };
  }

  const recommendations = getAlternativeCarriers(shipment);
  const topCarrier = recommendations[0] ?? null;

  const answer =
    !topCarrier
      ? `No alternative carriers found for ${shipment.shipmentId}.`
      : `For shipment ${shipment.shipmentId}, the recommended carrier replacement is ` +
        `${topCarrier.carrier.name} (score: ${topCarrier.score}/100). ` +
        `${topCarrier.reasoning}`;

  return {
    query,
    intent: 'CARRIERS',
    naturalLanguageAnswer: answer,
    data: {
      shipmentId: shipment.shipmentId,
      currentCarrierId: shipment.carrierId,
      recommendations,
    },
    relatedShipments: [shipment.shipmentId],
    suggestedFollowUps: [
      `What is the safest alternative route for ${shipment.shipmentId}?`,
      'Give me the top five actions I should take right now',
    ],
    generatedAt: new Date().toISOString(),
  };
}

function handleFleet(): CopilotResponse {
  const idleAssets = getIdleAssets();
  const redeployments = getAllRedeploymentRecommendations();

  const answer =
    idleAssets.length === 0
      ? 'All fleet assets are currently active. No idle assets available for redeployment.'
      : `There are ${idleAssets.length} idle/available fleet asset(s). ` +
        `Top redeployment opportunity: ` +
        (redeployments[0]
          ? `${redeployments[0].asset.name} (${redeployments[0].asset.assetId}) → ` +
            `shipment ${redeployments[0].targetShipmentId}, ` +
            `saving ~${redeployments[0].estimatedBenefitHours}h of delay.`
          : 'No specific redeployment match found.');

  return {
    query: 'Show me idle trucks that can be redeployed',
    intent: 'FLEET',
    naturalLanguageAnswer: answer,
    data: {
      idleAssets: idleAssets.map(a => ({
        assetId: a.assetId,
        type: a.type,
        name: a.name,
        location: a.currentLocation.name,
        isColdCapable: a.isColdCapable,
        capacity: a.capacity,
      })),
      redeploymentRecommendations: redeployments,
    },
    relatedShipments: redeployments.slice(0, 5).map(r => r.targetShipmentId),
    suggestedFollowUps: [
      'Which shipments are most affected by the active disruption?',
      'Summarize today\'s supply-chain situation',
    ],
    generatedAt: new Date().toISOString(),
  };
}

function handleColdChain(): CopilotResponse {
  const alerts = getActiveAlerts();
  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL');

  const firstAlert = alerts[0] ?? null;
  const answer =
    !firstAlert
      ? 'No active temperature excursions detected. All cold-chain shipments are within specification.'
      : `${alerts.length} cold-chain shipment(s) have temperature excursions. ` +
        `${criticalAlerts.length} are CRITICAL. ` +
        `Most urgent: ${firstAlert.shipmentId} — ${firstAlert.message}`;

  return {
    query: 'Which cold-chain shipments have temperature excursions?',
    intent: 'COLD_CHAIN',
    naturalLanguageAnswer: answer,
    data: alerts.map(a => ({
      alertId: a.alertId,
      shipmentId: a.shipmentId,
      severity: a.severity,
      currentTemp: a.currentTemp,
      allowedRange: `${a.allowedMin}–${a.allowedMax}°C`,
      deviation: a.deviation,
      excursionDurationMinutes: a.excursionDurationMinutes,
      message: a.message,
    })),
    relatedShipments: alerts.map(a => a.shipmentId),
    suggestedFollowUps: [
      'Why is the cold-chain shipment critical?',
      'Summarize today\'s supply-chain situation',
      'Give me the top five actions I should take right now',
    ],
    generatedAt: new Date().toISOString(),
  };
}

function handleSpecificShipment(query: string): CopilotResponse {
  const match = query.match(/SHP-\d+/i);
  const shipmentId = match?.[0]?.toUpperCase() ?? '';
  const shipment = state.shipments.find(s => s.shipmentId === shipmentId);

  if (!shipment) {
    return {
      query,
      intent: 'SPECIFIC_SHIPMENT',
      naturalLanguageAnswer: `Shipment ${shipmentId} not found in the system.`,
      data: null,
      suggestedFollowUps: ['Which shipment has the highest risk?'],
      generatedAt: new Date().toISOString(),
    };
  }

  const riskScore = analyzeShipmentRisk(shipment, getActiveDisruptions());
  const coldAnalysis = shipment.isColdChain
    ? analyzeShipmentTemperature(shipmentId)
    : null;

  const answer =
    `Shipment ${shipmentId}: ${shipment.cargoDescription}. ` +
    `Status: ${shipment.status}. Priority: ${shipment.priority}. ` +
    `Risk score: ${riskScore.overallScore}/100 (${riskScore.riskLevel}). ` +
    (riskScore.reasons.length > 0
      ? `Key risks: ${riskScore.reasons.slice(0, 2).join('; ')}.`
      : 'No active risk factors detected.') +
    (coldAnalysis
      ? ` Cold chain status: ${coldAnalysis.overallSeverity}. ${coldAnalysis.recommendation.substring(0, 100)}...`
      : '');

  return {
    query,
    intent: 'SPECIFIC_SHIPMENT',
    naturalLanguageAnswer: answer,
    data: {
      shipment,
      riskScore,
      coldChainAnalysis: coldAnalysis,
    },
    relatedShipments: [shipmentId],
    suggestedFollowUps: [
      `What is the safest alternative route for ${shipmentId}?`,
      `Which carrier should replace the current carrier for ${shipmentId}?`,
      'Summarize today\'s supply-chain situation',
    ],
    generatedAt: new Date().toISOString(),
  };
}

function handleBrief(): CopilotResponse {
  const brief = generateOperationsBrief();

  const answer =
    `Supply chain health: ${brief.supplyChainHealth} (${brief.healthScore}/100). ` +
    `${brief.activeDisruptions.length} active disruption(s). ` +
    `${brief.shipmentsAtRisk} shipment(s) at risk. ` +
    `$${(brief.totalCargoValueAtRiskUSD / 1_000_000).toFixed(1)}M cargo value at risk. ` +
    `${brief.coldChainAlerts.length} cold chain alert(s). ` +
    `Top action: ${brief.recommendedActions[0]?.action ?? 'None required.'}.`;

  return {
    query: 'Summarize today\'s supply-chain situation',
    intent: 'BRIEF',
    naturalLanguageAnswer: answer,
    data: brief,
    relatedShipments: brief.criticalShipments.map(s => s.shipmentId),
    suggestedFollowUps: [
      'Give me the top five actions I should take right now',
      'Which cold-chain shipments have temperature excursions?',
      'Which shipments are most affected by the active disruption?',
    ],
    generatedAt: new Date().toISOString(),
  };
}

function handleTopActions(): CopilotResponse {
  const brief = generateOperationsBrief();
  const actions = brief.recommendedActions;

  const answer =
    actions.length === 0
      ? 'No immediate actions required. Supply chain is operating normally.'
      : `Here are your top ${actions.length} priority actions:\n` +
        actions
          .map(a => `${a.rank}. [${a.urgency}] ${a.action} — ${a.impactDescription}`)
          .join('\n');

  return {
    query: 'Give me the top five actions I should take right now',
    intent: 'TOP_ACTIONS',
    naturalLanguageAnswer: answer,
    data: actions,
    relatedShipments: [...new Set(actions.flatMap(a => a.affectedShipments))].slice(0, 8),
    suggestedFollowUps: [
      'Which shipments are most affected by the active disruption?',
      'Which cold-chain shipments have temperature excursions?',
      'Summarize today\'s supply-chain situation',
    ],
    generatedAt: new Date().toISOString(),
  };
}

function handleCargoValue(): CopilotResponse {
  const results = getAffectedShipments()
    .filter(r => r.riskScore.cargoValueAtRisk > 0)
    .sort((a, b) => b.shipment.cargoValueUSD - a.shipment.cargoValueUSD)
    .slice(0, 10);

  const total = getTotalCargoValueAtRisk();

  const firstRisk = results[0] ?? null;
  const answer =
    !firstRisk
      ? 'No cargo value currently at risk.'
      : `Total cargo value at risk: $${(total / 1_000_000).toFixed(1)}M across ${results.length} shipment(s). ` +
        `Highest value: ${firstRisk.shipment.shipmentId} — ` +
        `$${(firstRisk.shipment.cargoValueUSD / 1_000_000).toFixed(2)}M ` +
        `(${firstRisk.shipment.cargoDescription.split('—').at(0)!.trim()}).`;

  return {
    query: 'Which shipments have the highest cargo value at risk?',
    intent: 'CARGO_VALUE',
    naturalLanguageAnswer: answer,
    data: results.map(r => ({
      shipmentId: r.shipment.shipmentId,
      cargoDescription: r.shipment.cargoDescription,
      cargoValueUSD: r.shipment.cargoValueUSD,
      riskScore: r.riskScore.overallScore,
      riskLevel: r.riskScore.riskLevel,
    })),
    relatedShipments: results.map(r => r.shipment.shipmentId),
    suggestedFollowUps: [
      'What is the safest alternative route for the top shipment?',
      'Which carrier should replace the current carrier?',
    ],
    generatedAt: new Date().toISOString(),
  };
}

// ─── Main query processor ─────────────────────────────────────

/**
 * Parses the natural language query, detects intent, and routes
 * to the appropriate engine. Returns a structured CopilotResponse.
 *
 * Supported queries:
 * - "Which shipments are most affected by the active disruption?"
 * - "Which shipment has the highest risk?"
 * - "Show me idle trucks that can be redeployed"
 * - "Which cold-chain shipments have temperature excursions?"
 * - "Why is SHP-XXXX critical?" / "Tell me about SHP-XXXX"
 * - "What is the safest alternative route for SHP-XXXX?"
 * - "Which carrier should replace the current carrier?"
 * - "Summarize today's supply-chain situation"
 * - "Give me the top five actions I should take right now"
 * - "Which shipments have the highest cargo value at risk?"
 */
export function processQuery(query: string): CopilotResponse {
  const intent = detectIntent(query);
  const q = query.toLowerCase();

  switch (intent) {
    case 'GREETING':
      return handleGreeting(query);

    case 'SPECIFIC_SHIPMENT':
      return handleSpecificShipment(query);

    case 'COLD_CHAIN':
      return handleColdChain();

    case 'FLEET':
      return handleFleet();

    case 'CARRIERS':
      return handleCarriers(query);

    case 'ROUTES':
      return handleRoutes(query);

    case 'TOP_ACTIONS':
      return handleTopActions();

    case 'CARGO_VALUE':
      return handleCargoValue();

    case 'BRIEF':
      return handleBrief();

    case 'DISRUPTIONS': {
      // Sub-intent: affected shipments vs general disruption info
      if (
        q.includes('affected') ||
        q.includes('which shipment') ||
        q.includes('impacted')
      ) {
        return handleAffectedShipments();
      }
      return handleDisruptions(query);
    }

    case 'SHIPMENT_RISK':
      return handleShipmentRisk();

    default: {
      // Unknown — run a best-effort brief
      const brief = handleBrief();
      return {
        ...brief,
        query,
        intent: 'UNKNOWN',
        naturalLanguageAnswer:
          `I wasn't sure exactly what you were asking, but here's a current supply chain brief: ` +
          brief.naturalLanguageAnswer,
        suggestedFollowUps: [
          'Which shipments are most affected by the active disruption?',
          'Which shipment has the highest risk?',
          'Summarize today\'s supply-chain situation',
          'Give me the top five actions I should take right now',
        ],
      };
    }
  }
}
