import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, Thermometer } from 'lucide-react';
import { getShipments } from '../api/client';
import type { Shipment } from '../../../shared/types';
import RiskBadge from '../components/ui/RiskBadge';
import StatusBadge from '../components/ui/StatusBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import PageHeader from '../components/ui/PageHeader';
import type { RiskLevel, ShipmentStatus } from '../../../shared/types';

const RISK_LEVELS = ['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const PRIORITIES = ['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES: ShipmentStatus[] = ['IN_TRANSIT', 'DELAYED', 'AT_RISK', 'DELIVERED', 'PENDING'];

// Lightweight risk score derived from status (real score fetched on detail)
function estimateRisk(s: Shipment): RiskLevel {
  if (s.status === 'AT_RISK') return 'HIGH';
  if (s.status === 'DELAYED') return 'MEDIUM';
  return 'LOW';
}

function formatCurrency(n: number) {
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${(n / 1000).toFixed(0)}K`;
}

export default function Shipments() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    riskLevel: '', priority: '', status: '', isColdChain: '',
  });
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getShipments();
      setShipments(data);
    } catch {
      setError('Failed to load shipments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = shipments.filter(s => {
    if (filters.status && s.status !== filters.status) return false;
    if (filters.priority && s.priority !== filters.priority) return false;
    if (filters.isColdChain === 'yes' && !s.isColdChain) return false;
    if (filters.isColdChain === 'no' && s.isColdChain) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.shipmentId.toLowerCase().includes(q) ||
        s.origin.name.toLowerCase().includes(q) ||
        s.destination.name.toLowerCase().includes(q) ||
        s.cargoDescription.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div>
      <PageHeader
        title="Shipments"
        description={`${filtered.length} of ${shipments.length} shipments`}
      />

      {/* Search + filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ID, origin, destination, cargo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filters.status}
          onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Status: All</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <select
          value={filters.priority}
          onChange={e => setFilters(p => ({ ...p, priority: e.target.value }))}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Priority: All</option>
          {PRIORITIES.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={filters.riskLevel}
          onChange={e => setFilters(p => ({ ...p, riskLevel: e.target.value }))}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Risk: All</option>
          {RISK_LEVELS.filter(Boolean).map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select
          value={filters.isColdChain}
          onChange={e => setFilters(p => ({ ...p, isColdChain: e.target.value }))}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Cold Chain: All</option>
          <option value="yes">Cold Chain Only</option>
          <option value="no">Non Cold Chain</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading shipments..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={load} />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Shipment ID', 'Route', 'Carrier', 'Cargo', 'Value', 'ETA', 'Priority', 'Status', 'Risk'].map(h => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                      No shipments match the current filters
                    </td>
                  </tr>
                ) : (
                  filtered.map(s => (
                    <tr
                      key={s.shipmentId}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/shipments/${s.shipmentId}`)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-mono text-xs font-semibold text-blue-700">{s.shipmentId}</span>
                          {s.isColdChain && <Thermometer className="w-3 h-3 text-blue-500" />}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <p className="text-xs text-gray-900">{s.origin.name}</p>
                          <p className="text-xs text-gray-500">→ {s.destination.name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                        {s.carrierId}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                        {s.cargoType}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-gray-900">
                        {formatCurrency(s.cargoValueUSD)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                        {new Date(s.estimatedArrival).toLocaleDateString()}
                        {s.delayHours > 0 && (
                          <span className="ml-1 text-orange-600 font-medium">+{s.delayHours}h</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          s.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                          s.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                          s.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {s.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={s.status} size="sm" />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <RiskBadge level={estimateRisk(s)} size="sm" />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
