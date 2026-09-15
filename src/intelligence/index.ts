// ============================================================
// SupplyGuard AI — Intelligence Engines Index
// ============================================================

// Disruption Engine
export {
  getActiveDisruptions,
  getMonitoredDisruptions,
  getAffectedRoutes,
  getDisruptionsForRoute,
  getDisruptionsForCarrier,
  calculateDisruptionSeverityScore,
  getDisruptionsRankedBySeverity,
  summarizeDisruption,
} from './disruptionEngine';

// Shipment Risk Engine
export {
  getRiskLevel,
  analyzeShipmentRisk,
  getAffectedShipments,
  getHighestRiskShipment,
  getCriticalAndHighRiskShipments,
  getTotalCargoValueAtRisk,
} from './shipmentRiskEngine';

// Route Engine
export {
  calculateRouteRisk,
  getAlternativeRoutes,
  getSafestRoute,
} from './routeEngine';

// Carrier Engine
export {
  scoreCarrier,
  rankCarriers,
  getAlternativeCarriers,
  getBestCarrier,
} from './carrierEngine';

// Fleet Engine
export {
  getIdleAssets,
  calculateIdleDuration,
  recommendRedeployment,
  getAllRedeploymentRecommendations,
  redeployAsset,
} from './fleetEngine';

// Cold Chain Engine
export {
  detectExcursions,
  classifySeverity,
  analyzeShipmentTemperature,
  getActiveAlerts,
} from './coldChainEngine';

// Operations Brief
export { generateOperationsBrief } from './operationsBrief';

// Scenario Engine
export {
  activateScenario,
  getActiveScenario,
  resetToDefault,
  listScenarios,
} from './scenarioEngine';

// Copilot Engine
export { processQuery, detectIntent } from './copilotEngine';
