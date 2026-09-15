import axios from 'axios';
import type {
  Shipment,
  Disruption,
  FleetAsset,
  Carrier,
  TemperatureAlert,
  ColdChainAnalysis,
  IoTReading,
  RiskScore,
  RouteRecommendation,
  CarrierRecommendation,
  FleetRedeployment,
  OperationsBrief,
  DemoScenario,
  CopilotResponse,
} from '../../../shared/types';

// ─── Axios instance ───────────────────────────────────────────

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ─── Response wrappers ────────────────────────────────────────

interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
}

// ─── Dashboard ────────────────────────────────────────────────

export interface DashboardData {
  activeDisruptions: number;
  atRiskShipments: number;
  idleFleetAssets: number;
  coldChainAlerts: number;
  cargoValueAtRisk: number;
  averageDelayHours: number;
  systemHealth: 'GREEN' | 'AMBER' | 'RED';
  recentAlerts: Array<{
    type: string;
    id: string;
    message: string;
    severity: string;
    shipmentId: string;
    detectedAt: string;
  }>;
  disruptionList: Disruption[];
  criticalShipments: Array<Shipment & { riskScore: RiskScore }>;
}

export const getDashboard = async (): Promise<DashboardData> => {
  const res = await api.get<ApiResponse<DashboardData>>('/dashboard');
  return res.data.data;
};

// ─── Disruptions ──────────────────────────────────────────────

export interface DisruptionFilters {
  status?: string;
  severity?: string;
  type?: string;
}

export const getDisruptions = async (filters?: DisruptionFilters): Promise<Disruption[]> => {
  const res = await api.get<ApiResponse<Disruption[]>>('/disruptions', { params: filters });
  return res.data.data;
};

export const getDisruption = async (id: string): Promise<Disruption> => {
  const res = await api.get<ApiResponse<Disruption>>(`/disruptions/${id}`);
  return res.data.data;
};

// ─── Shipments ────────────────────────────────────────────────

export interface ShipmentFilters {
  riskLevel?: string;
  priority?: string;
  carrierId?: string;
  status?: string;
  isColdChain?: boolean;
  search?: string;
}

export const getShipments = async (filters?: ShipmentFilters): Promise<Shipment[]> => {
  const res = await api.get<ApiResponse<Shipment[]>>('/shipments', { params: filters });
  return res.data.data;
};

export const getShipment = async (id: string): Promise<Shipment> => {
  const res = await api.get<ApiResponse<Shipment>>(`/shipments/${id}`);
  return res.data.data;
};

export const getShipmentRisk = async (id: string): Promise<RiskScore> => {
  const res = await api.get<ApiResponse<RiskScore>>(`/shipments/${id}/risk`);
  return res.data.data;
};

export const getShipmentRoutes = async (id: string): Promise<RouteRecommendation[]> => {
  const res = await api.get<ApiResponse<RouteRecommendation[]>>(`/shipments/${id}/routes`);
  return res.data.data;
};

export const getShipmentCarriers = async (id: string): Promise<CarrierRecommendation[]> => {
  const res = await api.get<ApiResponse<CarrierRecommendation[]>>(`/shipments/${id}/carriers`);
  return res.data.data;
};

// ─── Carriers ─────────────────────────────────────────────────

export const getCarriers = async (): Promise<Carrier[]> => {
  const res = await api.get<ApiResponse<Carrier[]>>('/carriers');
  return res.data.data;
};

// ─── Fleet ────────────────────────────────────────────────────

export interface FleetData {
  assets: FleetAsset[];
  summary: {
    total: number;
    inTransit: number;
    idle: number;
    maintenance: number;
    available: number;
    assigned: number;
  };
}

export const getFleet = async (): Promise<FleetData> => {
  const res = await api.get<any>('/fleet');
  const raw = res.data;
  const d = raw.data ?? raw;
  if (Array.isArray(d)) {
    const summary = raw.summary ?? {
      total: d.length,
      inTransit: d.filter((a: any) => a.status === 'IN_TRANSIT').length,
      idle: d.filter((a: any) => a.status === 'IDLE').length,
      maintenance: d.filter((a: any) => a.status === 'MAINTENANCE').length,
      available: d.filter((a: any) => a.status === 'AVAILABLE').length,
      assigned: d.filter((a: any) => a.status === 'ASSIGNED').length,
    };
    return { assets: d, summary };
  }
  return d;
};

export const getIdleFleet = async (): Promise<FleetRedeployment[]> => {
  const res = await api.get<ApiResponse<FleetRedeployment[]>>('/fleet/idle');
  return res.data.data;
};

export const redeployAsset = async (
  assetId: string,
  shipmentId: string
): Promise<{ message: string; asset: FleetAsset }> => {
  const res = await api.post<ApiResponse<{ message: string; asset: FleetAsset }>>(
    '/fleet/redeploy',
    { assetId, shipmentId }
  );
  return res.data.data;
};

// ─── Cold Chain ───────────────────────────────────────────────

export interface ColdChainAlertsData {
  alerts: TemperatureAlert[];
  summary: {
    total: number;
    critical: number;
    major: number;
    minor: number;
    normal: number;
  };
  disclaimer: string;
}

export const getColdChainAlerts = async (): Promise<ColdChainAlertsData> => {
  const res = await api.get<any>('/cold-chain/alerts');
  const raw = res.data;
  const d = raw.data ?? raw;
  if (Array.isArray(d)) {
    const summary = raw.summary ?? {
      total: d.length,
      critical: d.filter((a: any) => a.severity === 'CRITICAL').length,
      major: d.filter((a: any) => a.severity === 'MAJOR').length,
      minor: d.filter((a: any) => a.severity === 'MINOR').length,
      normal: d.filter((a: any) => a.severity === 'NORMAL').length,
    };
    return {
      alerts: d,
      summary,
      disclaimer: raw.disclaimer ?? 'Real-time IoT temperature monitoring actively streaming from in-transit cold storage units.',
    };
  }
  return d;
};

export type ColdChainDetail = ColdChainAnalysis & {
  analysis: ColdChainAnalysis;
  readings: IoTReading[];
};

export const getColdChainAnalysis = async (
  shipmentId: string
): Promise<ColdChainDetail> => {
  const res = await api.get<any>(`/cold-chain/${shipmentId}`);
  const raw = res.data;
  const d = raw.data ?? raw;
  const baseAnalysis: ColdChainAnalysis = d.analysis ?? d;
  const readings: IoTReading[] = Array.isArray(d?.readings) ? d.readings : [];
  return {
    ...baseAnalysis,
    analysis: baseAnalysis,
    readings,
  };
};

// ─── Copilot ──────────────────────────────────────────────────

export const sendCopilotQuery = async (query: string): Promise<CopilotResponse> => {
  const res = await api.post<any>('/copilot/query', { query });
  const raw = res.data;
  const d = raw.data ?? raw;
  return {
    query: d.query ?? query,
    intent: d.intent ?? 'UNKNOWN',
    naturalLanguageAnswer: d.naturalLanguageAnswer ?? d.answer ?? '',
    data: d.data,
    relatedShipments: d.relatedShipments ?? [],
    suggestedFollowUps: d.suggestedFollowUps ?? [],
    generatedAt: d.generatedAt ?? new Date().toISOString(),
  };
};

// ─── Operations Brief ─────────────────────────────────────────

export const getOperationsBrief = async (): Promise<OperationsBrief> => {
  const res = await api.get<ApiResponse<OperationsBrief>>('/operations-brief');
  return res.data.data;
};

// ─── Scenarios ────────────────────────────────────────────────

export const getScenarios = async (): Promise<DemoScenario[]> => {
  const res = await api.get<ApiResponse<DemoScenario[]>>('/scenarios');
  return res.data.data;
};

export const activateScenario = async (
  id: string
): Promise<{
  success: boolean;
  message: string;
  scenario: DemoScenario;
  changes: { disruptionsActivated: number; shipmentsAffected: number; assetsRedeployed: number };
}> => {
  const res = await api.post<
    ApiResponse<{
      success: boolean;
      message: string;
      scenario: DemoScenario;
      changes: { disruptionsActivated: number; shipmentsAffected: number; assetsRedeployed: number };
    }>
  >(`/scenarios/${id}/activate`);
  return res.data.data;
};

export const resetScenario = async (): Promise<void> => {
  await api.post('/scenarios/reset');
};
