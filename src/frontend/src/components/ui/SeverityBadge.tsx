import type { DisruptionSeverity, ExcursionSeverity } from '../../../../shared/types';

interface SeverityBadgeProps {
  severity: DisruptionSeverity | ExcursionSeverity;
  size?: 'sm' | 'md';
}

const colorMap: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800 border border-red-200',
  HIGH:     'bg-orange-100 text-orange-800 border border-orange-200',
  MAJOR:    'bg-orange-100 text-orange-800 border border-orange-200',
  MEDIUM:   'bg-yellow-100 text-yellow-800 border border-yellow-200',
  MINOR:    'bg-yellow-100 text-yellow-800 border border-yellow-200',
  LOW:      'bg-green-100 text-green-800 border border-green-200',
  NORMAL:   'bg-green-100 text-green-800 border border-green-200',
};

export default function SeverityBadge({ severity, size = 'md' }: SeverityBadgeProps) {
  const padding = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2.5 py-0.5 text-xs';
  return (
    <span className={`inline-flex items-center font-semibold rounded-full ${padding} ${colorMap[severity] ?? 'bg-gray-100 text-gray-700'}`}>
      {severity}
    </span>
  );
}
