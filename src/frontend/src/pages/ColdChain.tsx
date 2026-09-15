import { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, ReferenceLine, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { Thermometer, X, AlertTriangle } from 'lucide-react';
import { getColdChainAlerts, getColdChainAnalysis } from '../api/client';
import type { TemperatureAlert, ColdChainAnalysis, IoTReading } from '../../../shared/types';
import type { ColdChainAlertsData } from '../api/client';
import SeverityBadge from '../components/ui/SeverityBadge';
import KPICard from '../components/ui/KPICard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import PageHeader from '../components/ui/PageHeader';

interface DetailPanelProps {
  alert: TemperatureAlert;
  onClose: () => void;
}

function DetailPanel({ alert, onClose }: DetailPanelProps) {
  const [analysis, setAnalysis] = useState<{ analysis: ColdChainAnalysis; readings: IoTReading[] } | null>(null);

  useEffect(() => {
    getColdChainAnalysis(alert.shipmentId).then(setAnalysis).catch(() => {});
  }, [alert.shipmentId]);

  const tempData = analysis?.readings.map(r => ({
    time: new Date(r.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    temp: r.temperature,
  })) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white shadow-2xl border-l border-gray-200 overflow-y-auto h-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-orange-500" />
            <h2 className="text-base font-semibold text-gray-900">Cold Chain Alert</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">{alert.alertId}</p>
              <p className="text-xs text-gray-500">Shipment: {alert.shipmentId}</p>
            </div>
            <SeverityBadge severity={alert.severity} />
          </div>

          <p className="text-sm text-gray-700 leading-relaxed">{alert.message}</p>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              { label: 'Current Temp', value: `${alert.currentTemp}°C`, highlight: true },
              { label: 'Allowed Range', value: `${alert.allowedMin}°C – ${alert.allowedMax}°C` },
              { label: 'Deviation', value: `${alert.deviation.toFixed(1)}°C`, highlight: true },
              { label: 'Duration', value: `${alert.excursionDurationMinutes} min` },
              { label: 'Sensor', value: alert.sensorId },
              { label: 'Detected', value: new Date(alert.detectedAt).toLocaleString() },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="bg-gray-50 border border-gray-100 rounded p-2.5">
                <p className="text-gray-500">{label}</p>
                <p className={`font-semibold mt-0.5 ${highlight ? 'text-red-700' : 'text-gray-900'}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Temperature chart */}
          {tempData.length > 0 && analysis && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Temperature History</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={tempData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v) => [`${v}°C`, 'Temp']} />
                  <ReferenceLine y={analysis.analysis.allowedMin} stroke="#3b82f6" strokeDasharray="4 4" />
                  <ReferenceLine y={analysis.analysis.allowedMax} stroke="#3b82f6" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="temp" stroke="#ea580c" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Excursion events */}
          {analysis?.analysis.excursions && analysis.analysis.excursions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Excursion Events</p>
              {analysis.analysis.excursions.map((e, i) => (
                <div key={i} className="flex items-center gap-3 text-xs text-gray-600 border-b border-gray-100 py-1.5">
                  <AlertTriangle className="w-3 h-3 text-orange-500 flex-shrink-0" />
                  <span>{new Date(e.startTime).toLocaleTimeString()}</span>
                  <span>{e.durationMinutes} min</span>
                  <span className="font-mono">{e.minTemp}°–{e.maxTemp}°C</span>
                  <SeverityBadge severity={e.severity} size="sm" />
                </div>
              ))}
            </div>
          )}

          {analysis?.analysis.recommendation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-900 mb-1">Recommended Action</p>
              <p className="text-xs text-blue-800 leading-relaxed">{analysis.analysis.recommendation}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function rowBg(severity: string): string {
  switch (severity) {
    case 'CRITICAL': return 'bg-red-50 hover:bg-red-100';
    case 'MAJOR':    return 'bg-orange-50 hover:bg-orange-100';
    case 'MINOR':    return 'bg-yellow-50 hover:bg-yellow-100';
    default:         return 'bg-white hover:bg-gray-50';
  }
}

export default function ColdChain() {
  const [data, setData] = useState<ColdChainAlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TemperatureAlert | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const d = await getColdChainAlerts();
      setData(d);
    } catch {
      setError('Failed to load cold chain alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) return <LoadingSpinner message="Loading cold chain alerts..." />;
  if (error && !data) return <ErrorMessage message={error} onRetry={load} />;
  if (!data) return null;

  const { alerts, summary, disclaimer } = data;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cold Chain Monitoring"
        description="Temperature alerts and excursion events across cold-chain shipments"
      />

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPICard
          title="Total Alerts"
          value={summary.total}
          icon={<Thermometer className="w-4 h-4" />}
          accent={summary.total > 0 ? 'orange' : 'green'}
        />
        <KPICard
          title="Critical"
          value={summary.critical}
          icon={<AlertTriangle className="w-4 h-4" />}
          accent={summary.critical > 0 ? 'red' : 'green'}
        />
        <KPICard
          title="Major"
          value={summary.major}
          icon={<AlertTriangle className="w-4 h-4" />}
          accent={summary.major > 0 ? 'orange' : 'green'}
        />
        <KPICard
          title="Minor"
          value={summary.minor}
          icon={<Thermometer className="w-4 h-4" />}
          accent={summary.minor > 0 ? 'yellow' : 'green'}
        />
      </div>

      {/* Alerts table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Alert ID', 'Shipment', 'Temperature', 'Safe Range', 'Deviation', 'Duration', 'Sensor', 'Severity', 'Detected At', 'Action'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400">No active alerts</td>
                </tr>
              ) : (
                alerts.map(a => (
                  <tr
                    key={a.alertId}
                    className={`cursor-pointer transition-colors ${rowBg(a.severity)}`}
                    onClick={() => setSelected(a)}
                  >
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="font-mono text-xs text-blue-700">{a.alertId}</span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs">{a.shipmentId}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs font-mono font-semibold text-red-700">
                      {a.currentTemp}°C
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs font-mono">
                      {a.allowedMin}° – {a.allowedMax}°C
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-orange-700 font-medium">
                      {a.deviation.toFixed(1)}°C
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                      {a.excursionDurationMinutes} min
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-500">{a.sensorId}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <SeverityBadge severity={a.severity} size="sm" />
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-500">
                      {new Date(a.detectedAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {disclaimer && (
        <p className="text-xs text-gray-400 italic border-t border-gray-200 pt-4">{disclaimer}</p>
      )}

      {selected && (
        <DetailPanel alert={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
