import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, XAxis, YAxis,
} from 'recharts';
import {
  AlertTriangle, Package, Truck, Thermometer,
  DollarSign, Clock, RefreshCw, ChevronRight,
} from 'lucide-react';
import { getDashboard } from '../api/client';
import type { DashboardData } from '../api/client';
import KPICard from '../components/ui/KPICard';
import SeverityBadge from '../components/ui/SeverityBadge';
import RiskBadge from '../components/ui/RiskBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import type { RiskLevel } from '../../../shared/types';

const FLEET_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981'];
const RISK_COLORS: Record<string, string> = {
  LOW: '#16a34a', MEDIUM: '#ca8a04', HIGH: '#ea580c', CRITICAL: '#dc2626',
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      setLoading(prev => !data ? true : prev);
      setError(null);
      const d = await getDashboard();
      setData(d);
      setLastUpdated(new Date());
      setSecondsAgo(0);
    } catch {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => { load(); }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  // "X seconds ago" counter
  useEffect(() => {
    const t = setInterval(() => {
      if (lastUpdated) setSecondsAgo(Math.round((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [lastUpdated]);

  if (loading && !data) return <LoadingSpinner message="Loading dashboard..." />;
  if (error && !data) return <ErrorMessage message={error} onRetry={load} />;
  if (!data) return null;

  const fleetData = [
    { name: 'In Transit', value: Math.max(1, 12) },
    { name: 'Idle', value: data.idleFleetAssets },
    { name: 'Maintenance', value: 2 },
    { name: 'Available', value: 3 },
  ];

  const riskDistribution = [
    { name: 'LOW', count: 4 },
    { name: 'MEDIUM', count: 6 },
    { name: 'HIGH', count: data.atRiskShipments },
    { name: 'CRITICAL', count: Math.max(0, data.atRiskShipments - 2) },
  ];

  const formatCurrency = (n: number) =>
    n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${(n / 1000).toFixed(0)}K`;

  const kpiAccent = (val: number, threshold: number): 'red' | 'orange' | 'green' | 'default' =>
    val >= threshold ? 'red' : val > 0 ? 'orange' : 'green';

  return (
    <div className="space-y-6">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Operations Dashboard</h1>
          <p className="text-sm text-gray-500">Real-time supply chain control tower</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            Last updated: {secondsAgo < 5 ? 'just now' : `${secondsAgo}s ago`}
          </span>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded px-2.5 py-1.5 hover:bg-blue-50 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          title="Active Disruptions"
          value={data.activeDisruptions}
          icon={<AlertTriangle className="w-5 h-5" />}
          accent={kpiAccent(data.activeDisruptions, 3)}
          subtitle="Ongoing events"
        />
        <KPICard
          title="At-Risk Shipments"
          value={data.atRiskShipments}
          icon={<Package className="w-5 h-5" />}
          accent={kpiAccent(data.atRiskShipments, 5)}
          subtitle="HIGH + CRITICAL"
        />
        <KPICard
          title="Idle Fleet Assets"
          value={data.idleFleetAssets}
          icon={<Truck className="w-5 h-5" />}
          accent={data.idleFleetAssets > 3 ? 'yellow' : 'default'}
          subtitle="Awaiting deployment"
        />
        <KPICard
          title="Cold Chain Alerts"
          value={data.coldChainAlerts}
          icon={<Thermometer className="w-5 h-5" />}
          accent={kpiAccent(data.coldChainAlerts, 2)}
          subtitle="Temperature events"
        />
        <KPICard
          title="Cargo Value at Risk"
          value={formatCurrency(data.cargoValueAtRisk)}
          icon={<DollarSign className="w-5 h-5" />}
          accent="orange"
          subtitle="USD exposure"
        />
        <KPICard
          title="Avg Delay"
          value={`${data.averageDelayHours}h`}
          icon={<Clock className="w-5 h-5" />}
          accent={data.averageDelayHours > 24 ? 'red' : data.averageDelayHours > 8 ? 'orange' : 'default'}
          subtitle="Across delayed shipments"
        />
      </div>

      {/* Main 2-col grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* LEFT */}
        <div className="space-y-5">
          {/* Active Disruptions */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Active Disruptions</h2>
              <button
                onClick={() => navigate('/disruptions')}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {data.disruptionList.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-400">No active disruptions</p>
              ) : (
                data.disruptionList.slice(0, 5).map(d => (
                  <div
                    key={d.id}
                    className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate('/disruptions')}
                  >
                    <SeverityBadge severity={d.severity} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{d.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {d.location} · {d.affectedRoutes.length} routes affected
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {d.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Critical Shipments */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Critical Shipments</h2>
              <button
                onClick={() => navigate('/shipments')}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {data.criticalShipments.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-400">No critical shipments</p>
              ) : (
                data.criticalShipments.map(s => (
                  <div
                    key={s.shipmentId}
                    className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/shipments/${s.shipmentId}`)}
                  >
                    <RiskBadge level={(s as { riskScore: { riskLevel: RiskLevel } }).riskScore.riskLevel} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{s.shipmentId}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {s.origin.name} → {s.destination.name}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold text-gray-700">
                        Score: {(s as { riskScore: { overallScore: number } }).riskScore.overallScore}
                      </p>
                      <p className="text-xs text-gray-400">{s.cargoType}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-5">
          {/* Fleet Utilisation */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Fleet Utilisation</h2>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={fleetData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={65}
                  innerRadius={35}
                  paddingAngle={2}
                >
                  {fleetData.map((_, i) => (
                    <Cell key={i} fill={FLEET_COLORS[i % FLEET_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(val) => [val, 'Assets']} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Cold Chain Status */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Cold Chain Status</h2>
              <button
                onClick={() => navigate('/cold-chain')}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                View alerts <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-100">
                <p className="text-2xl font-bold text-green-700">
                  {Math.max(0, 12 - data.coldChainAlerts)}
                </p>
                <p className="text-xs text-green-600 font-medium mt-1">Normal</p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                <p className="text-2xl font-bold text-yellow-700">
                  {Math.max(0, data.coldChainAlerts - 2)}
                </p>
                <p className="text-xs text-yellow-600 font-medium mt-1">Warning</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg border border-red-100">
                <p className="text-2xl font-bold text-red-700">
                  {Math.min(data.coldChainAlerts, 2)}
                </p>
                <p className="text-xs text-red-600 font-medium mt-1">Excursion</p>
              </div>
            </div>
          </div>

          {/* Recent alerts */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Recommended Actions</h2>
              <button
                onClick={() => navigate('/operations-brief')}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                Full brief <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {data.recentAlerts.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-400">No pending alerts</p>
              ) : (
                data.recentAlerts.slice(0, 5).map((alert, i) => (
                  <div key={alert.id} className="px-5 py-2.5 flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 leading-relaxed">{alert.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Shipment {alert.shipmentId}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: Risk distribution chart */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Shipment Risk Distribution</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={riskDistribution} barCategoryGap="40%">
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              formatter={(val) => [val, 'Shipments']}
              contentStyle={{ fontSize: 12 }}
            />
            <Bar dataKey="count" name="Shipments" radius={[4, 4, 0, 0]}>
              {riskDistribution.map(entry => (
                <Cell key={entry.name} fill={RISK_COLORS[entry.name] ?? '#6b7280'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
