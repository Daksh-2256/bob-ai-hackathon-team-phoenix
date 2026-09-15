import { useState, useEffect, useCallback } from 'react';
import { MapPin, Clock, AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react';
import { getDisruptions, getDisruption } from '../api/client';
import type { Disruption } from '../../../shared/types';
import SeverityBadge from '../components/ui/SeverityBadge';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import PageHeader from '../components/ui/PageHeader';

const SEVERITY_OPTIONS = ['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUS_OPTIONS = ['', 'ACTIVE', 'MONITORING', 'RESOLVED'];
const TYPE_OPTIONS = [
  '', 'WEATHER', 'PORT_STRIKE', 'GEOPOLITICAL', 'ROAD_CLOSURE',
  'AIRPORT_CLOSURE', 'INFRASTRUCTURE_FAILURE', 'CARRIER_CAPACITY_LOSS',
];

interface DisruptionDetailPanelProps {
  id: string;
  onClose: () => void;
}

function DisruptionDetailPanel({ id, onClose }: DisruptionDetailPanelProps) {
  const [detail, setDetail] = useState<Disruption | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDisruption(id).then(setDetail).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white shadow-2xl border-l border-gray-200 overflow-y-auto h-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 className="text-base font-semibold text-gray-900">Disruption Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : !detail ? (
          <div className="p-5 text-sm text-gray-500">Failed to load details.</div>
        ) : (
          <div className="p-5 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{detail.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{detail.type.replace(/_/g, ' ')}</p>
              </div>
              <SeverityBadge severity={detail.severity} />
            </div>

            <p className="text-sm text-gray-700 leading-relaxed">{detail.description}</p>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Location</p>
                <p className="text-gray-900 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  {detail.location}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Status</p>
                <p className="text-gray-900 mt-1">{detail.status}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Started</p>
                <p className="text-gray-900 mt-1">{new Date(detail.startTime).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Expected End</p>
                <p className="text-gray-900 mt-1">{new Date(detail.expectedEndTime).toLocaleString()}</p>
              </div>
              {detail.estimatedDelayHours != null && (
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Est. Delay</p>
                  <p className="text-gray-900 mt-1">{detail.estimatedDelayHours}h</p>
                </div>
              )}
              {detail.impactRadius != null && (
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Impact Radius</p>
                  <p className="text-gray-900 mt-1">{detail.impactRadius} km</p>
                </div>
              )}
            </div>

            {detail.affectedRoutes.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Affected Routes ({detail.affectedRoutes.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {detail.affectedRoutes.map(r => (
                    <span key={r} className="text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded px-2 py-0.5">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {detail.affectedCarriers && detail.affectedCarriers.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Affected Carriers
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {detail.affectedCarriers.map(c => (
                    <span key={c} className="text-xs bg-gray-100 text-gray-700 border border-gray-200 rounded px-2 py-0.5">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DisruptionCard({ d, onSelect }: { d: Disruption; onSelect: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`bg-white rounded-lg border shadow-sm transition-all ${
        d.status === 'ACTIVE' ? 'border-orange-200' : 'border-gray-200'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 mt-0.5">
              <AlertTriangle
                className={`w-5 h-5 ${
                  d.severity === 'CRITICAL' ? 'text-red-500' :
                  d.severity === 'HIGH' ? 'text-orange-500' :
                  d.severity === 'MEDIUM' ? 'text-yellow-500' : 'text-green-500'
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-gray-900">{d.name}</h3>
                <SeverityBadge severity={d.severity} size="sm" />
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  d.status === 'ACTIVE' ? 'bg-red-50 text-red-700' :
                  d.status === 'MONITORING' ? 'bg-yellow-50 text-yellow-700' :
                  'bg-green-50 text-green-700'
                }`}>
                  {d.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {d.type.replace(/_/g, ' ')} · {d.affectedRoutes.length} routes
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {d.location}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {new Date(d.startTime).toLocaleDateString()}
          </span>
          {d.estimatedDelayHours != null && (
            <span className="text-orange-600 font-medium">~{d.estimatedDelayHours}h delay</span>
          )}
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-600 leading-relaxed">{d.description}</p>
          </div>
        )}

        <div className="mt-3 flex justify-end">
          <button
            onClick={() => onSelect(d.id)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-200 rounded px-3 py-1.5 hover:bg-blue-50 transition-colors"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Disruptions() {
  const [disruptions, setDisruptions] = useState<Disruption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ status: '', severity: '', type: '' });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDisruptions(filters);
      setDisruptions(data);
    } catch {
      setError('Failed to load disruptions');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const counts = {
    CRITICAL: disruptions.filter(d => d.severity === 'CRITICAL').length,
    HIGH: disruptions.filter(d => d.severity === 'HIGH').length,
    ACTIVE: disruptions.filter(d => d.status === 'ACTIVE').length,
  };

  return (
    <div>
      <PageHeader
        title="Disruptions"
        description="Monitor and manage active supply chain disruptions"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs bg-red-100 text-red-700 border border-red-200 rounded-full px-2.5 py-1 font-medium">
            {counts.ACTIVE} Active
          </span>
          <span className="text-xs bg-orange-100 text-orange-700 border border-orange-200 rounded-full px-2.5 py-1 font-medium">
            {counts.CRITICAL} Critical
          </span>
        </div>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        {[
          { label: 'Status', key: 'status', options: STATUS_OPTIONS },
          { label: 'Severity', key: 'severity', options: SEVERITY_OPTIONS },
          { label: 'Type', key: 'type', options: TYPE_OPTIONS },
        ].map(f => (
          <select
            key={f.key}
            value={filters[f.key as keyof typeof filters]}
            onChange={e => setFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{f.label}: All</option>
            {f.options.filter(Boolean).map(opt => (
              <option key={opt} value={opt}>{opt.replace(/_/g, ' ')}</option>
            ))}
          </select>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner message="Loading disruptions..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={load} />
      ) : (
        <div className="space-y-3">
          {disruptions.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-400">No disruptions match the current filters</p>
            </div>
          ) : (
            disruptions.map(d => (
              <DisruptionCard key={d.id} d={d} onSelect={setSelectedId} />
            ))
          )}
        </div>
      )}

      {selectedId && (
        <DisruptionDetailPanel id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
