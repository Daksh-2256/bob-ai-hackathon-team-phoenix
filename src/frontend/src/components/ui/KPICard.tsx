import type { ReactNode } from 'react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: string;
  trendUp?: boolean;
  accent?: 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'default';
  subtitle?: string;
}

const accentMap: Record<string, string> = {
  red:     'border-l-red-500',
  orange:  'border-l-orange-500',
  yellow:  'border-l-yellow-500',
  green:   'border-l-green-500',
  blue:    'border-l-blue-500',
  default: 'border-l-gray-300',
};

const iconBgMap: Record<string, string> = {
  red:     'bg-red-50 text-red-600',
  orange:  'bg-orange-50 text-orange-600',
  yellow:  'bg-yellow-50 text-yellow-600',
  green:   'bg-green-50 text-green-600',
  blue:    'bg-blue-50 text-blue-600',
  default: 'bg-gray-50 text-gray-600',
};

export default function KPICard({
  title,
  value,
  icon,
  trend,
  trendUp,
  accent = 'default',
  subtitle,
}: KPICardProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 border-l-4 ${accentMap[accent]} shadow-sm`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider truncate">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
          {trend && (
            <p className={`mt-1 text-xs font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        <div className={`ml-3 p-2 rounded-lg flex-shrink-0 ${iconBgMap[accent]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
