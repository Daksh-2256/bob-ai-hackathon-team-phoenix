import { useState, useCallback, useEffect } from 'react';
import { Printer, RefreshCw, CheckCircle, AlertTriangle, Clock, Package, Thermometer, Truck, DollarSign } from 'lucide-react';
import { getOperationsBrief } from '../api/client';
import type { OperationsBrief } from '../../../shared/types';
import SeverityBadge from '../components/ui/SeverityBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';

const healthColors: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  GREEN: { bg: 'bg-green-50 border-green-200', text: 'text-green-800', dot: 'bg-green-500', label: 'Operational' },
  AMBER: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-800', dot: 'bg-yellow-400', label: 'Degraded' },
  RED:   { bg: 'bg-red-50 border-red-200',       text: 'text-red-800',    dot: 'bg-red-500',    label: 'Critical' },
};

function formatCurrency(n: number) {
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${(n / 1000).toFixed(0)}K`;
}

export default function OperationsBrief() {
  const [brief, setBrief] = useState<OperationsBrief | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const d = await getOperationsBrief();
      setBrief(d);
    } catch {
      setError('Failed to generate operations brief');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    generate();
  }, [generate]);

  if (loading) return <LoadingSpinner message="Generating operations brief..." />;

  if (!brief && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Operations Brief</h2>
          <p className="text-sm text-gray-500 mt-2 max-w-sm">
            Generate a real-time AI-powered brief of your entire supply chain situation, including recommended actions and risk summary.
          </p>
        </div>
        <button
          onClick={generate}
          className="flex items-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg"
        >
          <RefreshCw className="w-4 h-4" />
          Generate Brief
        </button>
        {error && <ErrorMessage message={error} onRetry={generate} />}
      </div>
    );
  }

  if (error) return <ErrorMessage message={error} onRetry={generate} />;
  if (!brief) return null;

  const health = healthColors[brief.supplyChainHealth] ?? healthColors.GREEN;

  return (
    <div className="space-y-6 max-w-3xl mx-auto print:max-w-none">
      {/* Actions bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Operations Brief</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Generated at: {new Date(brief.generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={generate}
            className="flex items-center gap-1.5 text-sm border border-gray-300 rounded-lg px-3 py-1.5 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Regenerate
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 text-sm bg-gray-900 text-white rounded-lg px-3 py-1.5 hover:bg-gray-700 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Export
          </button>
        </div>
      </div>

      {/* BLUF Header */}
      <div className={`rounded-xl border p-6 ${health.bg}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-3 h-3 rounded-full ${health.dot}`} />
          <span className={`text-sm font-bold uppercase tracking-wider ${health.text}`}>
            BOTTOM LINE UP FRONT
          </span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1">
            <p className={`text-sm leading-relaxed ${health.text}`}>{brief.summary}</p>
          </div>
          <div className={`flex-shrink-0 text-center ${health.text}`}>
            <p className="text-xs font-medium uppercase tracking-wide opacity-70">Health Score</p>
            <p className="text-5xl font-bold tabular-nums mt-1">{brief.healthScore}</p>
            <p className="text-sm font-semibold mt-0.5">{health.label}</p>
          </div>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
          <AlertTriangle className="w-5 h-5 text-orange-500 mx-auto mb-1.5" />
          <p className="text-2xl font-bold text-gray-900">{brief.activeDisruptions.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Active Disruptions</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
          <Package className="w-5 h-5 text-blue-500 mx-auto mb-1.5" />
          <p className="text-2xl font-bold text-gray-900">{brief.shipmentsAtRisk}</p>
          <p className="text-xs text-gray-500 mt-0.5">Shipments at Risk</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
          <DollarSign className="w-5 h-5 text-red-500 mx-auto mb-1.5" />
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(brief.totalCargoValueAtRiskUSD)}</p>
          <p className="text-xs text-gray-500 mt-0.5">Cargo Value at Risk</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center shadow-sm">
          <Clock className="w-5 h-5 text-yellow-500 mx-auto mb-1.5" />
          <p className="text-2xl font-bold text-gray-900">{brief.delaysDetected}</p>
          <p className="text-xs text-gray-500 mt-0.5">Delays Detected</p>
        </div>
      </div>

      {/* Recommended Actions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          Recommended Actions
        </h2>
        <div className="space-y-3">
          {brief.recommendedActions.map(action => (
            <div key={action.rank} className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                action.urgency === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                action.urgency === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                action.urgency === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {action.rank}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">{action.action}</p>
                  <SeverityBadge severity={action.urgency} size="sm" />
                </div>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{action.reason}</p>
                <p className="text-xs text-green-700 font-medium mt-1">{action.impactDescription}</p>
                {action.affectedShipments.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {action.affectedShipments.map(s => (
                      <span key={s} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5 font-mono">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Disruptions */}
      {brief.activeDisruptions.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Active Disruptions
          </h2>
          <div className="space-y-2">
            {brief.activeDisruptions.map(d => (
              <div key={d.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <SeverityBadge severity={d.severity} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 font-medium">{d.name}</p>
                  <p className="text-xs text-gray-500">{d.location} · {d.affectedRoutes.length} routes</p>
                </div>
                <span className="text-xs text-gray-400">{d.type.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Critical Shipments */}
      {brief.criticalShipments.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-500" />
            Critical Shipments
          </h2>
          <div className="space-y-2">
            {brief.criticalShipments.map(s => (
              <div key={s.shipmentId} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className="font-mono text-xs font-semibold text-blue-700">{s.shipmentId}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-600 truncate">{s.origin.name} → {s.destination.name}</p>
                </div>
                <span className="text-xs text-gray-500">{s.cargoType}</span>
                {s.delayHours > 0 && (
                  <span className="text-xs text-orange-600 font-medium">+{s.delayHours}h</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cold Chain & Fleet */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-blue-500" />
            Cold Chain Alerts ({brief.coldChainAlerts.length})
          </h2>
          {brief.coldChainAlerts.length === 0 ? (
            <p className="text-sm text-green-600 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> All cold chain shipments nominal
            </p>
          ) : (
            <div className="space-y-1.5">
              {brief.coldChainAlerts.slice(0, 4).map(a => (
                <div key={a.alertId} className="flex items-center gap-2 text-xs">
                  <SeverityBadge severity={a.severity} size="sm" />
                  <span className="font-mono text-gray-700">{a.shipmentId}</span>
                  <span className="text-red-600 font-medium">{a.currentTemp}°C</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-yellow-500" />
            Fleet Opportunities ({brief.idleFleetOpportunities.length})
          </h2>
          {brief.idleFleetOpportunities.length === 0 ? (
            <p className="text-sm text-green-600 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> No idle assets to redeploy
            </p>
          ) : (
            <div className="space-y-1.5">
              {brief.idleFleetOpportunities.slice(0, 4).map((op, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-gray-700">{op.asset.assetId}</span>
                  <span className="text-gray-500">→</span>
                  <span className="font-mono text-blue-700">{op.targetShipmentId}</span>
                  <span className="text-green-600 font-medium">-{op.estimatedBenefitHours}h</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expected Impact */}
      <div className="bg-gray-900 text-white rounded-xl p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider mb-3 text-gray-300">Expected Impact</h2>
        <p className="text-sm text-gray-100 leading-relaxed">{brief.expectedImpact}</p>
      </div>
    </div>
  );
}
