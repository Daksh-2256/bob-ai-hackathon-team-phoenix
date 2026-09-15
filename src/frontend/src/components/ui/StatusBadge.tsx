import type { ShipmentStatus, FleetAssetStatus } from '../../../../shared/types';

interface StatusBadgeProps {
  status: ShipmentStatus | FleetAssetStatus | string;
  size?: 'sm' | 'md';
}

const colorMap: Record<string, string> = {
  IN_TRANSIT:  'bg-blue-100 text-blue-800 border border-blue-200',
  DELAYED:     'bg-orange-100 text-orange-800 border border-orange-200',
  AT_RISK:     'bg-red-100 text-red-800 border border-red-200',
  DELIVERED:   'bg-green-100 text-green-800 border border-green-200',
  PENDING:     'bg-gray-100 text-gray-700 border border-gray-200',
  ASSIGNED:    'bg-blue-100 text-blue-800 border border-blue-200',
  IDLE:        'bg-yellow-100 text-yellow-800 border border-yellow-200',
  MAINTENANCE: 'bg-purple-100 text-purple-800 border border-purple-200',
  AVAILABLE:   'bg-emerald-100 text-emerald-800 border border-emerald-200',
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const padding = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-0.5 text-xs';
  const label = status.replace(/_/g, ' ');
  return (
    <span className={`inline-flex items-center font-semibold rounded-full ${padding} ${colorMap[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {label}
    </span>
  );
}
