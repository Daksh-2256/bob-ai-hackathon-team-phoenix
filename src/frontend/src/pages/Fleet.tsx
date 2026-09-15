import { useState, useEffect, useCallback } from 'react';
import { Truck, Container, Ship, MapPin, Clock, ChevronRight, X, CheckCircle } from 'lucide-react';
import { getFleet, redeployAsset } from '../api/client';
import type { FleetAsset, FleetAssetStatus } from '../../../shared/types';
import type { FleetData } from '../api/client';
import StatusBadge from '../components/ui/StatusBadge';
import KPICard from '../components/ui/KPICard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';
import PageHeader from '../components/ui/PageHeader';

const FILTER_TABS: (FleetAssetStatus | 'ALL')[] = ['ALL', 'IN_TRANSIT', 'IDLE', 'AVAILABLE', 'MAINTENANCE', 'ASSIGNED'];

function AssetIcon({ type }: { type: FleetAsset['type'] }) {
  if (type === 'TRUCK') return <Truck className="w-5 h-5" />;
  if (type === 'VESSEL') return <Ship className="w-5 h-5" />;
  return <Container className="w-5 h-5" />;
}

function idleDuration(lastActivity: string) {
  const diff = Date.now() - new Date(lastActivity).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return `${hours}h idle`;
  return `${Math.floor(hours / 24)}d idle`;
}

interface RedeployModalProps {
  asset: FleetAsset;
  onConfirm: (assetId: string, shipmentId: string) => Promise<void>;
  onClose: () => void;
}

function RedeployModal({ asset, onConfirm, onClose }: RedeployModalProps) {
  const [targetShipment] = useState('SHP-URGENT-001');
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    await onConfirm(asset.assetId, targetShipment);
    setDone(true);
    setConfirming(false);
    setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}
      >
        {done ? (
          <div className="text-center py-4">
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-900">Asset Redeployed!</p>
            <p className="text-xs text-gray-500 mt-1">{asset.assetId} assigned to {targetShipment}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Redeploy Asset</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
              <p className="font-medium text-gray-900">{asset.assetId}</p>
              <p className="text-gray-500 text-xs mt-0.5">{asset.name} · {asset.type}</p>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {asset.currentLocation.name}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs font-medium text-blue-900">Best Match Shipment</p>
              <p className="text-sm font-bold text-blue-800 mt-1">{targetShipment}</p>
              <p className="text-xs text-green-700 font-medium mt-1">
                ✓ Potential benefit: ~12h delay reduction
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors font-medium"
              >
                {confirming ? 'Deploying...' : 'Confirm Deploy'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Fleet() {
  const [fleetData, setFleetData] = useState<FleetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FleetAssetStatus | 'ALL'>('ALL');
  const [redeployTarget, setRedeployTarget] = useState<FleetAsset | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const d = await getFleet();
      setFleetData(d);
    } catch {
      setError('Failed to load fleet data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRedeploy = async (assetId: string, shipmentId: string) => {
    try {
      await redeployAsset(assetId, shipmentId);
      await load();
    } catch {
      // silently handle
    }
  };

  const filtered = (fleetData?.assets ?? []).filter(a =>
    activeFilter === 'ALL' || a.status === activeFilter
  );

  if (loading && !fleetData) return <LoadingSpinner message="Loading fleet data..." />;
  if (error && !fleetData) return <ErrorMessage message={error} onRetry={load} />;
  if (!fleetData) return null;

  const s = fleetData.summary;

  return (
    <div className="space-y-5">
      <PageHeader title="Fleet Optimizer" description="Manage and redeploy fleet assets in real time" />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard title="Total Assets" value={s.total} icon={<Truck className="w-4 h-4" />} accent="blue" />
        <KPICard title="In Transit" value={s.inTransit} icon={<ChevronRight className="w-4 h-4" />} accent="blue" />
        <KPICard title="Idle" value={s.idle} icon={<Clock className="w-4 h-4" />} accent={s.idle > 3 ? 'yellow' : 'default'} />
        <KPICard title="Maintenance" value={s.maintenance} icon={<Container className="w-4 h-4" />} accent="default" />
        <KPICard title="Available" value={s.available} icon={<CheckCircle className="w-4 h-4" />} accent="green" />
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {FILTER_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              activeFilter === tab
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {tab === 'ALL' ? 'All Assets' : tab.replace(/_/g, ' ')}
            <span className="ml-1.5 opacity-70">
              {tab === 'ALL'
                ? s.total
                : (fleetData.assets.filter(a => a.status === tab).length)}
            </span>
          </button>
        ))}
      </div>

      {/* Asset grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(asset => (
          <div
            key={asset.assetId}
            className={`bg-white rounded-lg border shadow-sm p-4 ${
              asset.status === 'IDLE' || asset.status === 'AVAILABLE'
                ? 'border-yellow-200'
                : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${
                  asset.status === 'IN_TRANSIT' || asset.status === 'ASSIGNED' ? 'bg-blue-50 text-blue-600' :
                  asset.status === 'IDLE' ? 'bg-yellow-50 text-yellow-600' :
                  asset.status === 'AVAILABLE' ? 'bg-green-50 text-green-600' :
                  'bg-gray-50 text-gray-600'
                }`}>
                  <AssetIcon type={asset.type} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 font-mono">{asset.assetId}</p>
                  <p className="text-xs text-gray-500">{asset.name}</p>
                </div>
              </div>
              <StatusBadge status={asset.status} size="sm" />
            </div>

            <div className="space-y-1.5 text-xs text-gray-600">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span>{asset.currentLocation.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Container className="w-3 h-3 text-gray-400" />
                <span>Capacity: {asset.capacity} TEU · {asset.utilizationPct}% utilised</span>
              </div>
              {(asset.status === 'IDLE' || asset.status === 'AVAILABLE') && (
                <div className="flex items-center gap-1.5 text-yellow-700 font-medium">
                  <Clock className="w-3 h-3" />
                  <span>{idleDuration(asset.lastActivity)}</span>
                </div>
              )}
              {asset.assignedShipmentId && (
                <div className="text-blue-600 font-medium">
                  Assigned: {asset.assignedShipmentId}
                </div>
              )}
              {asset.isColdCapable && (
                <div className="text-blue-600">❄ Cold-capable</div>
              )}
              {asset.fuelLevelPct != null && (
                <div>Fuel: {asset.fuelLevelPct}%</div>
              )}
            </div>

            {(asset.status === 'IDLE' || asset.status === 'AVAILABLE') && (
              <button
                onClick={() => setRedeployTarget(asset)}
                className="mt-3 w-full py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                REDEPLOY
              </button>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-sm text-gray-400">No assets in this category</p>
          </div>
        )}
      </div>

      {redeployTarget && (
        <RedeployModal
          asset={redeployTarget}
          onConfirm={handleRedeploy}
          onClose={() => setRedeployTarget(null)}
        />
      )}
    </div>
  );
}
