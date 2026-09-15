import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronRight, Package, Thermometer, Truck, Star, CheckCircle,
  AlertTriangle, ChevronDown, ChevronUp, MapPin,
} from 'lucide-react';
import {
  getShipment, getShipmentRisk, getShipmentRoutes,
  getShipmentCarriers, getColdChainAnalysis,
} from '../api/client';
import type { Shipment, RiskScore, RouteRecommendation, CarrierRecommendation, ColdChainAnalysis } from '../../../shared/types';
import RiskBadge from '../components/ui/RiskBadge';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';

function formatCurrency(n: number) {
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${(n / 1000).toFixed(0)}K`;
}

function RiskScoreBar({ score }: { score: number }) {
  const color = score >= 75 ? 'bg-red-500' : score >= 50 ? 'bg-orange-500' : score >= 25 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
    </div>
  );
}

export default function ShipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [risk, setRisk] = useState<RiskScore | null>(null);
  const [routes, setRoutes] = useState<RouteRecommendation[]>([]);
  const [carriers, setCarriers] = useState<CarrierRecommendation[]>([]);
  const [coldChain, setColdChain] = useState<ColdChainAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riskExpanded, setRiskExpanded] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getShipment(id),
      getShipmentRisk(id),
      getShipmentRoutes(id),
      getShipmentCarriers(id),
    ])
      .then(([s, r, ro, ca]) => {
        setShipment(s);
        setRisk(r);
        setRoutes(ro);
        setCarriers(ca);
        if (s.isColdChain) {
          getColdChainAnalysis(id).then(setColdChain).catch(() => {});
        }
      })
      .catch(() => setError('Failed to load shipment details'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner message="Loading shipment details..." />;
  if (error || !shipment) return <ErrorMessage message={error ?? 'Shipment not found'} onRetry={() => navigate('/shipments')} />;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-gray-500">
        <button onClick={() => navigate('/shipments')} className="hover:text-blue-600">Shipments</button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">{shipment.shipmentId}</span>
      </nav>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT: Shipment info */}
        <div className="xl:col-span-1 space-y-5">
          {/* Main info card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" />
                <h1 className="text-base font-bold text-gray-900 font-mono">{shipment.shipmentId}</h1>
                {shipment.isColdChain && <Thermometer className="w-4 h-4 text-blue-500" />}
              </div>
              <StatusBadge status={shipment.status} />
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">Route</p>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-gray-700">{shipment.origin.name}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  <MapPin className="w-3.5 h-3.5 text-red-500" />
                  <span className="text-gray-700">{shipment.destination.name}</span>
                </div>
              </div>

              {[
                { label: 'Carrier', value: shipment.carrierId },
                { label: 'Cargo Type', value: shipment.cargoType },
                { label: 'Description', value: shipment.cargoDescription },
                { label: 'Cargo Value', value: formatCurrency(shipment.cargoValueUSD) },
                { label: 'Weight', value: `${shipment.weightKg.toLocaleString()} kg` },
                { label: 'Priority', value: shipment.priority },
                { label: 'Departure', value: new Date(shipment.departureTime).toLocaleString() },
                { label: 'ETA', value: new Date(shipment.estimatedArrival).toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-2">
                  <span className="text-xs text-gray-500 font-medium shrink-0">{label}</span>
                  <span className="text-xs text-gray-900 text-right">{value}</span>
                </div>
              ))}

              {shipment.delayHours > 0 && (
                <div className="flex justify-between gap-2">
                  <span className="text-xs text-gray-500 font-medium">Current Delay</span>
                  <span className="text-xs font-semibold text-orange-600">+{shipment.delayHours}h</span>
                </div>
              )}

              {shipment.isColdChain && (
                <div className="flex justify-between gap-2">
                  <span className="text-xs text-gray-500 font-medium">Temp Range</span>
                  <span className="text-xs text-blue-700 font-mono">
                    {shipment.temperatureMin}°C – {shipment.temperatureMax}°C
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Risk score */}
          {risk && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700">Risk Assessment</h2>
                <RiskBadge level={risk.riskLevel} />
              </div>

              <div className="text-center mb-4">
                <p className="text-5xl font-bold tabular-nums" style={{
                  color: risk.overallScore >= 75 ? '#dc2626' :
                         risk.overallScore >= 50 ? '#ea580c' :
                         risk.overallScore >= 25 ? '#ca8a04' : '#16a34a'
                }}>
                  {risk.overallScore}
                </p>
                <p className="text-xs text-gray-500 mt-1">Risk Score (0–100)</p>
              </div>

              <RiskScoreBar score={risk.overallScore} />

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 rounded p-2.5">
                  <p className="text-gray-500">Est. Delay</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{risk.estimatedDelayHours}h</p>
                </div>
                <div className="bg-gray-50 rounded p-2.5">
                  <p className="text-gray-500">Value at Risk</p>
                  <p className="font-semibold text-gray-900 mt-0.5">{formatCurrency(risk.cargoValueAtRisk)}</p>
                </div>
              </div>

              {/* Risk reasons */}
              <button
                className="mt-4 w-full flex items-center justify-between text-xs text-blue-600 hover:text-blue-800"
                onClick={() => setRiskExpanded(e => !e)}
              >
                <span>Why is this shipment at risk?</span>
                {riskExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {riskExpanded && (
                <div className="mt-3 space-y-1.5">
                  {risk.reasons.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                      <AlertTriangle className="w-3 h-3 text-orange-400 mt-0.5 flex-shrink-0" />
                      <span>{r}</span>
                    </div>
                  ))}
                  {risk.factors.map(f => (
                    <div key={f.factor} className="mt-2">
                      <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                        <span>{f.factor}</span>
                        <span className="font-medium">{f.score}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1">
                        <div
                          className="h-1 bg-blue-400 rounded-full"
                          style={{ width: `${f.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Routes, Carriers, Cold Chain */}
        <div className="xl:col-span-2 space-y-5">
          {/* Alternative Routes */}
          {routes.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Alternative Routes</h2>
              <div className="space-y-3">
                {routes.map((r, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-4 ${
                      r.recommendation === 'RECOMMENDED'
                        ? 'border-green-300 bg-green-50'
                        : r.recommendation === 'AVOID'
                        ? 'border-red-200 bg-red-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">{r.route.name}</p>
                        {r.recommendation === 'RECOMMENDED' && (
                          <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 border border-green-200 rounded-full px-2 py-0.5 font-semibold">
                            <CheckCircle className="w-3 h-3" /> RECOMMENDED
                          </span>
                        )}
                        {r.recommendation === 'AVOID' && (
                          <span className="text-xs bg-red-100 text-red-700 border border-red-200 rounded-full px-2 py-0.5 font-semibold">
                            AVOID
                          </span>
                        )}
                      </div>
                      <div className="text-right text-xs font-medium text-gray-600">
                        Risk: {r.riskScore}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{r.reasoning}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-600">
                      <span><strong>ETA:</strong> {r.estimatedDays}d</span>
                      <span><strong>Cost:</strong> {formatCurrency(r.estimatedCostUSD)}</span>
                      <span><strong>Mode:</strong> {r.route.transportMode}</span>
                      {r.savingsVsCurrent != null && r.savingsVsCurrent > 0 && (
                        <span className="text-green-600 font-medium">
                          Saves {r.savingsVsCurrent}h
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Alternative Carriers */}
          {carriers.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Alternative Carriers</h2>
              <div className="space-y-3">
                {carriers.slice(0, 3).map(c => (
                  <div key={c.carrier.carrierId} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="flex-shrink-0 w-7 h-7 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                      {c.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900">{c.carrier.name}</p>
                        <span className="flex items-center gap-1 text-xs text-yellow-600">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          {c.carrier.reliabilityScore}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{c.reasoning}</p>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600">
                        <span><strong>Score:</strong> {c.score}</span>
                        <span><strong>Cost:</strong> {formatCurrency(c.estimatedCostUSD)}</span>
                        <span><strong>Capacity:</strong> {c.availableCapacity} TEU</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cold Chain */}
          {shipment.isColdChain && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Thermometer className="w-4 h-4 text-blue-500" />
                <h2 className="text-sm font-semibold text-gray-700">Cold Chain Monitoring</h2>
              </div>

              {coldChain ? (
                <>
                  <div className="grid grid-cols-3 gap-3 mb-4 text-xs">
                    <div className="bg-blue-50 border border-blue-100 rounded p-2.5 text-center">
                      <p className="text-gray-500">Allowed Range</p>
                      <p className="font-semibold text-blue-800 mt-0.5 font-mono">
                        {coldChain.allowedMin}°C–{coldChain.allowedMax}°C
                      </p>
                    </div>
                    <div className="bg-gray-50 border border-gray-100 rounded p-2.5 text-center">
                      <p className="text-gray-500">In-Range %</p>
                      <p className={`font-semibold mt-0.5 ${coldChain.percentTimeInRange >= 95 ? 'text-green-700' : 'text-orange-700'}`}>
                        {coldChain.percentTimeInRange.toFixed(1)}%
                      </p>
                    </div>
                    <div className={`rounded p-2.5 text-center border ${
                      coldChain.overallSeverity === 'NORMAL'
                        ? 'bg-green-50 border-green-100'
                        : coldChain.overallSeverity === 'MINOR'
                        ? 'bg-yellow-50 border-yellow-100'
                        : 'bg-red-50 border-red-100'
                    }`}>
                      <p className="text-gray-500">Status</p>
                      <p className={`font-semibold mt-0.5 ${
                        coldChain.overallSeverity === 'NORMAL' ? 'text-green-700' :
                        coldChain.overallSeverity === 'MINOR' ? 'text-yellow-700' : 'text-red-700'
                      }`}>
                        {coldChain.overallSeverity}
                      </p>
                    </div>
                  </div>

                  {coldChain.excursions.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-red-700 mb-2">
                        {coldChain.excursions.length} Excursion Event{coldChain.excursions.length > 1 ? 's' : ''}
                      </p>
                      {coldChain.excursions.map((e, i) => (
                        <div key={i} className="text-xs text-gray-600 flex justify-between border-b border-gray-100 pb-1 mb-1">
                          <span>{new Date(e.startTime).toLocaleTimeString()}</span>
                          <span>{e.durationMinutes}min</span>
                          <span>{e.minTemp}°C–{e.maxTemp}°C</span>
                          <span className="font-medium text-red-600">{e.severity}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="mt-3 text-xs text-gray-500 italic">{coldChain.recommendation}</p>
                </>
              ) : (
                <div className="text-xs text-gray-400 text-center py-4">Loading cold chain data...</div>
              )}
            </div>
          )}

          {/* Fleet Assignment */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-4 h-4 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-700">Fleet Assignment</h2>
            </div>
            <p className="text-sm text-gray-600">
              {shipment.carrierId
                ? <>Asset <span className="font-mono font-medium text-blue-700">{shipment.carrierId}</span> assigned</>
                : <span className="text-gray-400">No fleet asset assigned</span>}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
