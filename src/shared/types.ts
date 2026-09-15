// ============================================================
// SupplyGuard AI — Shared TypeScript Types
// IBM Bob AI Innovation Hackathon 2026 — Team Phoenix
// ============================================================

// ─── Enums ──────────────────────────────────────────────────

export type ShipmentStatus = 'IN_TRANSIT' | 'DELAYED' | 'AT_RISK' | 'DELIVERED' | 'PENDING';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type DisruptionType =
  | 'WEATHER'
  | 'PORT_STRIKE'
  | 'GEOPOLITICAL'
  | 'ROAD_CLOSURE'
  | 'AIRPORT_CLOSURE'
  | 'INFRASTRUCTURE_FAILURE'
  | 'CARRIER_CAPACITY_LOSS';
export type DisruptionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type DisruptionStatus = 'ACTIVE' | 'RESOLVED' | 'MONITORING';
export type FleetAssetType = 'TRUCK' | 'CONTAINER' | 'VESSEL';
export type FleetAssetStatus = 'IN_TRANSIT' | 'ASSIGNED' | 'IDLE' | 'MAINTENANCE' | 'AVAILABLE';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type HealthStatus = 'GREEN' | 'AMBER' | 'RED';
export type SensorStatus = 'NORMAL' | 'WARNING' | 'EXCURSION' | 'CRITICAL' | 'OFFLINE';
export type ExcursionSeverity = 'NORMAL' | 'MINOR' | 'MAJOR' | 'CRITICAL';
export type CargoType =
  | 'VACCINES'
  | 'PHARMACEUTICALS'
  | 'ELECTRONICS'
  | 'AUTO_PARTS'
  | 'PERISHABLES'
  | 'CHEMICALS'
  | 'LUXURY_GOODS'
  | 'FROZEN_FOOD'
  | 'INDUSTRIAL'
  | 'CONSUMER_GOODS';

// ─── Shipment ────────────────────────────────────────────────

export interface GeoLocation {
  lat: number;
  lng: number;
  name: string;
}

export interface Shipment {
  shipmentId: string;
  carrierId: string;
  routeId: string;
  origin: GeoLocation;
  destination: GeoLocation;
  currentLocation: GeoLocation;
  status: ShipmentStatus;
  priority: Priority;
  cargoType: CargoType;
  cargoDescription: string;
  cargoValueUSD: number;
  weightKg: number;
  isColdChain: boolean;
  temperatureMin?: number; // °C
  temperatureMax?: number; // °C
  departureTime: string;   // ISO 8601
  estimatedArrival: string;
  actualArrival?: string;
  delayHours: number;
  trackingEvents: TrackingEvent[];
  notes?: string;
}

export interface TrackingEvent {
  timestamp: string;
  location: GeoLocation;
  event: string;
  details?: string;
}

// ─── Disruption ──────────────────────────────────────────────

export interface Disruption {
  id: string;
  type: DisruptionType;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  severity: DisruptionSeverity;
  startTime: string;
  expectedEndTime: string;
  affectedRoutes: string[];
  affectedCarriers?: string[];
  description: string;
  status: DisruptionStatus;
  impactRadius?: number; // km
  estimatedDelayHours?: number;
}

// ─── Fleet ────────────────────────────────────────────────────

export interface FleetAsset {
  assetId: string;
  type: FleetAssetType;
  name: string;
  registrationNumber: string;
  carrierId: string;
  status: FleetAssetStatus;
  currentLocation: GeoLocation;
  capacity: number;         // TEUs for containers/vessels, tonnes for trucks
  utilizationPct: number;   // 0-100
  lastActivity: string;     // ISO timestamp
  assignedShipmentId?: string;
  maintenanceDue?: string;
  fuelLevelPct?: number;
  isColdCapable: boolean;
}

// ─── Carrier ──────────────────────────────────────────────────

export interface Carrier {
  carrierId: string;
  name: string;
  region: string;
  availableCapacity: number; // TEUs
  totalCapacity: number;
  reliabilityScore: number;  // 0-100
  averageDelayHours: number;
  costMultiplier: number;    // relative to baseline (1.0)
  supportedRoutes: string[];
  status: 'ACTIVE' | 'REDUCED_CAPACITY' | 'SUSPENDED';
  contactEmail: string;
  contactPhone: string;
  notes?: string;
}

// ─── Route ────────────────────────────────────────────────────

export interface Waypoint {
  location: GeoLocation;
  estimatedArrival?: string;
  type: 'ORIGIN' | 'PORT' | 'HUB' | 'CUSTOMS' | 'DESTINATION';
}

export interface Route {
  routeId: string;
  name: string;
  origin: GeoLocation;
  destination: GeoLocation;
  waypoints: Waypoint[];
  distanceKm: number;
  estimatedDays: number;
  baseCostUSD: number;
  carriers: string[];        // carrierId[]
  disruptionExposure: number; // 0-100 (baseline risk score)
  transportMode: 'SEA' | 'AIR' | 'ROAD' | 'MULTIMODAL';
  isAlternative?: boolean;
}

// ─── IoT / Cold-Chain ─────────────────────────────────────────

export interface IoTReading {
  readingId: string;
  sensorId: string;
  shipmentId: string;
  timestamp: string;
  temperature: number;   // °C
  humidity: number;      // %RH
  location: GeoLocation;
  batteryPct: number;
  sensorStatus: SensorStatus;
  pressure?: number;     // hPa
  shockDetected?: boolean;
}

export interface ExcursionEvent {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  minTemp: number;
  maxTemp: number;
  maxDeviation: number;
  severity: ExcursionSeverity;
}

export interface TemperatureAlert {
  alertId: string;
  shipmentId: string;
  sensorId: string;
  detectedAt: string;
  currentTemp: number;
  allowedMin: number;
  allowedMax: number;
  deviation: number;
  severity: ExcursionSeverity;
  excursionDurationMinutes: number;
  message: string;
  acknowledged: boolean;
}

export interface ColdChainAnalysis {
  shipmentId: string;
  cargoType: CargoType;
  allowedMin: number;
  allowedMax: number;
  totalReadings: number;
  excursions: ExcursionEvent[];
  overallSeverity: ExcursionSeverity;
  percentTimeInRange: number;
  maxDeviation: number;
  recommendation: string;
}

// ─── Risk Scoring ─────────────────────────────────────────────

export interface RiskFactor {
  factor: string;
  weight: number;       // 0-1
  score: number;        // 0-100
  description: string;
}

export interface RiskScore {
  shipmentId: string;
  overallScore: number; // 0-100
  riskLevel: RiskLevel;
  estimatedDelayHours: number;
  cargoValueAtRisk: number;
  factors: RiskFactor[];
  reasons: string[];
  calculatedAt: string;
}

// ─── Recommendations ──────────────────────────────────────────

export interface RouteRecommendation {
  route: Route;
  estimatedDays: number;
  estimatedCostUSD: number;
  riskScore: number;
  recommendation: 'RECOMMENDED' | 'ALTERNATIVE' | 'AVOID';
  reasoning: string;
  savingsVsCurrent?: number; // hours saved
}

export interface CarrierRecommendation {
  carrier: Carrier;
  rank: number;
  score: number;        // composite score 0-100
  availableCapacity: number;
  estimatedCostUSD: number;
  reasoning: string;
  pros: string[];
  cons: string[];
}

export interface FleetRedeployment {
  asset: FleetAsset;
  targetShipmentId: string;
  currentLocation: GeoLocation;
  targetLocation: GeoLocation;
  transitHours: number;
  estimatedBenefitHours: number; // delay reduction
  reasoning: string;
  priority: Priority;
}

// ─── Operations Brief ─────────────────────────────────────────

export interface RecommendedAction {
  rank: number;
  action: string;
  reason: string;
  impactDescription: string;
  affectedShipments: string[];
  urgency: Priority;
}

export interface OperationsBrief {
  generatedAt: string;
  supplyChainHealth: HealthStatus;
  healthScore: number; // 0-100
  summary: string;
  activeDisruptions: Disruption[];
  criticalShipments: Shipment[];
  totalCargoValueAtRiskUSD: number;
  coldChainAlerts: TemperatureAlert[];
  idleFleetOpportunities: FleetRedeployment[];
  recommendedActions: RecommendedAction[];
  expectedImpact: string;
  shipmentsAtRisk: number;
  delaysDetected: number;
}

// ─── Demo Scenarios ───────────────────────────────────────────

export interface DemoScenario {
  scenarioId: string;
  name: string;
  description: string;
  activateDisruptions: string[];   // disruption ids
  affectedShipments: string[];     // shipment ids
  triggerColdChainEvents?: boolean;
  coldChainShipments?: string[];
  expectedActions: string[];
  durationMinutes: number;
}

// ─── Copilot ──────────────────────────────────────────────────

export type QueryIntent =
  | 'DISRUPTIONS'
  | 'SHIPMENT_RISK'
  | 'ROUTES'
  | 'CARRIERS'
  | 'FLEET'
  | 'COLD_CHAIN'
  | 'BRIEF'
  | 'TOP_ACTIONS'
  | 'CARGO_VALUE'
  | 'SPECIFIC_SHIPMENT'
  | 'UNKNOWN';

export interface CopilotResponse {
  query: string;
  intent: QueryIntent;
  naturalLanguageAnswer: string;
  data: unknown;
  relatedShipments?: string[];
  suggestedFollowUps: string[];
  generatedAt: string;
}
